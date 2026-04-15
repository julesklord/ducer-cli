/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import {
  mapCoreStatusToDisplayStatus,
  ToolCallStatus,
  CoreToolCallStatus,
} from './types.js';

describe('mapCoreStatusToDisplayStatus', () => {
  it('should map Validating to Pending', () => {
    expect(mapCoreStatusToDisplayStatus(CoreToolCallStatus.Validating)).toBe(
      ToolCallStatus.Pending,
    );
  });

  it('should map AwaitingApproval to Confirming', () => {
    expect(
      mapCoreStatusToDisplayStatus(CoreToolCallStatus.AwaitingApproval),
    ).toBe(ToolCallStatus.Confirming);
  });

  it('should map Executing to Executing', () => {
    expect(mapCoreStatusToDisplayStatus(CoreToolCallStatus.Executing)).toBe(
      ToolCallStatus.Executing,
    );
  });

  it('should map Success to Success', () => {
    expect(mapCoreStatusToDisplayStatus(CoreToolCallStatus.Success)).toBe(
      ToolCallStatus.Success,
    );
  });

  it('should map Cancelled to Canceled', () => {
    expect(mapCoreStatusToDisplayStatus(CoreToolCallStatus.Cancelled)).toBe(
      ToolCallStatus.Canceled,
    );
  });

  it('should map Error to Error', () => {
    expect(mapCoreStatusToDisplayStatus(CoreToolCallStatus.Error)).toBe(
      ToolCallStatus.Error,
    );
  });

  it('should map Scheduled to Pending', () => {
    expect(mapCoreStatusToDisplayStatus(CoreToolCallStatus.Scheduled)).toBe(
      ToolCallStatus.Pending,
    );
  });
});
