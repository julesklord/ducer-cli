/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { randomUUID } from 'node:crypto';
import {
  type ToolCall,
  type ToolCallRequestInfo,
  type ToolCallResponseInfo,
  CoreToolCallStatus,
  type ValidatingToolCall,
  type ScheduledToolCall,
  type ExecutingToolCall,
  type WaitingToolCall,
  type TailToolCallRequest,
  type ConfirmHandler,
  type OutputUpdateHandler,
  type AllToolCallsCompleteHandler,
  type ToolCallsUpdateHandler,
} from './types.js';
import { type MessageBus } from '../utils/message-bus.js';
import { type Config } from '../config/config.js';
import { type AnyToolInvocation, type ToolLiveOutput } from '../tools/tools.js';
import { CoreToolError, ToolErrorType } from '../tools/tool-error.js';
import { coreEvents } from '../utils/events.js';
import { debugLogger } from '../utils/debugLogger.js';
import { getErrorMessage } from '../utils/errors.js';
import { logToolCall } from '../telemetry/loggers.js';
import { ToolCallEvent } from '../telemetry/types.js';
import { runWithToolCallContext } from '../utils/toolCallContext.js';

/**
 * Scheduler state.
 */
class SchedulerState {
  private queue: ToolCall[] = [];
  private activeCalls: Map<string, ToolCall> = new Map();
  private history: ToolCall[] = [];

  get queueLength(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.activeCalls.size;
  }

  enqueue(call: ToolCall): void {
    this.queue.push(call);
  }

  dequeue(): ToolCall | undefined {
    return this.queue.shift();
  }

  peekQueue(): ToolCall | undefined {
    return this.queue[0];
  }

  setActive(call: ToolCall): void {
    this.activeCalls.set(call.request.callId, call);
  }

  removeActive(callId: string): void {
    this.activeCalls.delete(callId);
  }

  getActive(callId: string): ToolCall | undefined {
    return this.activeCalls.get(callId);
  }

  addToHistory(call: ToolCall): void {
    this.history.push(call);
  }

  getAllCalls(): ToolCall[] {
    return [...this.history, ...Array.from(this.activeCalls.values()), ...this.queue];
  }
}

/**
 * Tool call scheduler.
 */
export class Scheduler {
  private state = new SchedulerState();
  private confirmHandler?: ConfirmHandler;
  private outputUpdateHandler?: OutputUpdateHandler;
  private allCompleteHandler?: AllToolCallsCompleteHandler;
  private toolCallsUpdateHandler?: ToolCallsUpdateHandler;
  private isProcessing = false;

  constructor(
    private readonly config: Config,
    private readonly messageBus: MessageBus,
  ) {}

  onConfirm(handler: ConfirmHandler): void {
    this.confirmHandler = handler;
  }

  onOutputUpdate(handler: OutputUpdateHandler): void {
    this.outputUpdateHandler = handler;
  }

  onAllComplete(handler: AllToolCallsCompleteHandler): void {
    this.allCompleteHandler = handler;
  }

  onToolCallsUpdate(handler: ToolCallsUpdateHandler): void {
    this.toolCallsUpdateHandler = handler;
  }

  async schedule(request: ToolCallRequestInfo): Promise<void> {
    const tool = this.config.getTool(request.name);
    if (!tool) {
      throw new CoreToolError(
        ToolErrorType.NotFound,
        `Tool not found: ${request.name}`,
      );
    }

    const invocation = (tool as any).createInvocation(
      request.args,
      this.messageBus,
    );

    const call: ValidatingToolCall = {
      status: CoreToolCallStatus.Validating,
      request,
      tool,
      invocation,
      startTime: Date.now(),
    };

    this.state.setActive(call);
    this._notifyUpdate();

    // Start processing if not already
    if (!this.isProcessing) {
      this._processLoop().catch((err) => {
        debugLogger.error('Error in scheduler loop:', err);
      });
    }
  }

  private _notifyUpdate(): void {
    if (this.toolCallsUpdateHandler) {
      this.toolCallsUpdateHandler(this.state.getAllCalls());
    }
  }

  private async _processLoop(): Promise<void> {
    this.isProcessing = true;
    try {
      while (this.state.queueLength > 0 || this.state.activeCount > 0) {
        const next = this.state.dequeue();
        if (!next) {
          // Wait for active calls to finish or new items to be enqueued
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }

        if (next.status === CoreToolCallStatus.Validating) {
          await this._processValidatingCall(next, new AbortController().signal);
        }
        // ... other status handling ...
      }
    } finally {
      this.isProcessing = false;
      if (this.allCompleteHandler) {
        // Find completed calls from history (simplified for this task)
        const completed = this.state.getAllCalls().filter(
          (c) =>
            c.status === CoreToolCallStatus.Success ||
            c.status === CoreToolCallStatus.Error ||
            c.status === CoreToolCallStatus.Cancelled,
        ) as any[];
        await this.allCompleteHandler(completed);
      }
    }
  }

  private _isParallelizable(request: ToolCallRequestInfo): boolean {
    const tool = this.config.getTool(request.name);
    if (!tool) return false;
    return (tool as any).isParallelizable !== false;
  }

  private async _processValidatingCall(
    active: ValidatingToolCall,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      await this._processToolCall(active, signal);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      debugLogger.error(`Error processing tool call ${active.request.callId}:`, err);
    }
  }

  private async _processToolCall(
    call: ToolCall,
    _signal: AbortSignal,
  ): Promise<void> {
    // Simplified implementation for the task
    debugLogger.debug(`Processing tool call: ${call.request.callId}`);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion */
  private _hasResourceConflict(callA: any, callB: any): boolean {
    if (
      callA.status === CoreToolCallStatus.Error ||
      callB.status === CoreToolCallStatus.Error
    ) {
      return false;
    }

    const invocationA = (callA as any).invocation;
    const invocationB = (callB as any).invocation;

    if (!invocationA || !invocationB) {
      return false;
    }

    const locsA = invocationA.toolLocations();
    const locsB = invocationB.toolLocations();

    for (const lA of locsA) {
      for (const lB of locsB) {
        if (lA.path === lB.path) {
          // Conflict if at least one is NOT read-only
          if (!lA.readOnly || !lB.readOnly) {
            return true;
          }
        }
      }
    }

    return false;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion */
}
