/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Manages Function Calling (Tools) for the music layer.
 */
export declare class MusicToolsManager {
    /**
     * Returns minimized JSON schema declarations for music-specific tools.
     */
    getMusicToolsDeclarations(): ({
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                viz: {
                    type: string;
                    description: string;
                };
                start: {
                    type: string;
                    description: string;
                };
                duration: {
                    type: string;
                    description: string;
                };
                style: {
                    type: string;
                    description: string;
                };
                focus?: undefined;
                key?: undefined;
                query?: undefined;
                name?: undefined;
                action_id?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                focus: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                key?: undefined;
                query?: undefined;
                name?: undefined;
                action_id?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                key: {
                    type: string;
                    description: string;
                };
                style: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                focus?: undefined;
                query?: undefined;
                name?: undefined;
                action_id?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                query: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                focus?: undefined;
                key?: undefined;
                name?: undefined;
                action_id?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                name: {
                    type: string;
                    description: string;
                };
                action_id: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                focus?: undefined;
                key?: undefined;
                query?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                focus?: undefined;
                key?: undefined;
                query?: undefined;
                name?: undefined;
                action_id?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required?: undefined;
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                action_id: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                focus?: undefined;
                key?: undefined;
                query?: undefined;
                name?: undefined;
                code?: undefined;
                full_scan?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                code: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                focus?: undefined;
                key?: undefined;
                query?: undefined;
                name?: undefined;
                action_id?: undefined;
                full_scan?: undefined;
            };
            required: string[];
        };
    } | {
        name: string;
        description: string;
        parameters: {
            type: string;
            properties: {
                full_scan: {
                    type: string;
                    description: string;
                };
                viz?: undefined;
                start?: undefined;
                duration?: undefined;
                style?: undefined;
                focus?: undefined;
                key?: undefined;
                query?: undefined;
                name?: undefined;
                action_id?: undefined;
                code?: undefined;
            };
            required?: undefined;
        };
    })[];
}
