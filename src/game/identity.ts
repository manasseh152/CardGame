/**
 * Player Identity System
 * 
 * Provides unique identification for players, sessions, devices, and rooms.
 * Designed for future multi-device, multi-room, and persistent player support.
 */

import { customAlphabet } from 'nanoid';

// Human-friendly alphabet (no confusing characters like 0/O, 1/I/L)
const ROOM_CODE_ALPHABET = '23456789ABCDEFGHKLMNPQRSTUVWXYZ';
const generateRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 6);

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

/** Unique identifier for a player (persists across sessions) */
export type PlayerId = string & { readonly __brand: 'PlayerId' };

/** Unique identifier for a game session/connection */
export type SessionId = string & { readonly __brand: 'SessionId' };

/** Unique identifier for a device */
export type DeviceId = string & { readonly __brand: 'DeviceId' };

/** Unique identifier for a room/table */
export type RoomId = string & { readonly __brand: 'RoomId' };

/** Unique identifier for a hand (used for split hands) */
export type HandId = string & { readonly __brand: 'HandId' };

// ============================================================================
// ID Generation
// ============================================================================

const ID_PREFIXES = {
    player: 'pl',
    session: 'ss',
    device: 'dv',
    room: 'rm',
    hand: 'hd',
} as const;

type IdPrefix = typeof ID_PREFIXES[keyof typeof ID_PREFIXES];

/**
 * Generates a unique ID with a prefix for easy identification.
 * Format: {prefix}_{uuid}
 * Example: pl_a1b2c3d4-e5f6-7890-abcd-ef1234567890
 */
function generateId<T extends string>(prefix: IdPrefix): T {
    const uuid = crypto.randomUUID();
    return `${prefix}_${uuid}` as T;
}

/**
 * Generates a short ID for display purposes.
 * Format: {prefix}_{8-char-hex}
 * Example: pl_a1b2c3d4
 */
function generateShortId<T extends string>(prefix: IdPrefix): T {
    const hex = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    return `${prefix}_${hex}` as T;
}

// ============================================================================
// ID Factory
// ============================================================================

export const IdFactory = {
    /** Create a new player ID */
    playerId: (): PlayerId => generateId<PlayerId>(ID_PREFIXES.player),
    
    /** Create a new session ID */
    sessionId: (): SessionId => generateId<SessionId>(ID_PREFIXES.session),
    
    /** Create a new device ID */
    deviceId: (): DeviceId => generateId<DeviceId>(ID_PREFIXES.device),
    
    /** 
     * Create a new room code (human-friendly, 6 chars)
     * Uses custom alphabet without confusing characters (0/O, 1/I/L)
     * Example: "9EAG6G", "HKMP3N"
     */
    roomId: (): RoomId => generateRoomCode() as RoomId,
    
    /** Create a new hand ID */
    handId: (): HandId => generateShortId<HandId>(ID_PREFIXES.hand),

    /** Create a dealer ID (special case - deterministic) */
    dealerId: (): PlayerId => 'pl_dealer' as PlayerId,

    /** Validate if a string is a valid ID of a specific type */
    isValid: {
        playerId: (id: string): id is PlayerId => id.startsWith('pl_'),
        sessionId: (id: string): id is SessionId => id.startsWith('ss_'),
        deviceId: (id: string): id is DeviceId => id.startsWith('dv_'),
        /** Room codes are 6 uppercase alphanumeric chars */
        roomId: (id: string): id is RoomId => /^[23456789ABCDEFGHKLMNPQRSTUVWXYZ]{6}$/.test(id),
        handId: (id: string): id is HandId => id.startsWith('hd_'),
    },

    /** Extract the prefix from an ID (returns null for room codes) */
    getPrefix: (id: string): IdPrefix | null => {
        const prefix = id.split('_')[0] as IdPrefix;
        return Object.values(ID_PREFIXES).includes(prefix) ? prefix : null;
    },
    
    /** Normalize a room code (uppercase, trim) */
    normalizeRoomCode: (code: string): RoomId | null => {
        const normalized = code.trim().toUpperCase();
        return IdFactory.isValid.roomId(normalized) ? normalized : null;
    },
} as const;

// ============================================================================
// Player Identity
// ============================================================================

/**
 * Complete player identity information.
 * Used for persistent player tracking across sessions and devices.
 */
export interface PlayerIdentity {
    /** Unique player ID - persists across sessions */
    id: PlayerId;
    
    /** Display name */
    name: string;
    
    /** Current session ID (changes on reconnect) */
    sessionId?: SessionId;
    
    /** Device ID (for multi-device support) */
    deviceId?: DeviceId;
    
    /** Room/table the player is currently in */
    roomId?: RoomId;
    
    /** Metadata */
    meta: PlayerMeta;
}

export interface PlayerMeta {
    /** When the player identity was created */
    createdAt: Date;
    
    /** Last time the player was active */
    lastSeenAt: Date;
    
    /** Number of games played (for stats) */
    gamesPlayed: number;
    
    /** Is this a guest/anonymous player? */
    isGuest: boolean;
    
    /** Custom data for future extensions */
    custom?: Record<string, unknown>;
}

/**
 * Creates a new player identity with default metadata.
 */
export function createPlayerIdentity(
    name: string,
    options: Partial<Omit<PlayerIdentity, 'id' | 'name' | 'meta'>> & { 
        id?: PlayerId;
        isGuest?: boolean;
    } = {}
): PlayerIdentity {
    const now = new Date();
    
    return {
        id: options.id ?? IdFactory.playerId(),
        name,
        sessionId: options.sessionId,
        deviceId: options.deviceId,
        roomId: options.roomId,
        meta: {
            createdAt: now,
            lastSeenAt: now,
            gamesPlayed: 0,
            isGuest: options.isGuest ?? true,
        },
    };
}

/**
 * Updates the last seen timestamp on a player identity.
 */
export function touchPlayerIdentity(identity: PlayerIdentity): PlayerIdentity {
    return {
        ...identity,
        meta: {
            ...identity.meta,
            lastSeenAt: new Date(),
        },
    };
}

// ============================================================================
// Room/Table Identity
// ============================================================================

export interface RoomIdentity {
    /** Unique room ID */
    id: RoomId;
    
    /** Room display name */
    name: string;
    
    /** Maximum number of players */
    maxPlayers: number;
    
    /** Current player IDs in the room */
    playerIds: PlayerId[];
    
    /** Room settings */
    settings: RoomSettings;
    
    /** When the room was created */
    createdAt: Date;
}

export interface RoomSettings {
    /** Is the room private (invite only)? */
    isPrivate: boolean;
    
    /** Minimum bet amount */
    minBet: number;
    
    /** Maximum bet amount */
    maxBet: number;
    
    /** Number of decks to use */
    deckCount: number;
    
    /** Custom settings for future extensions */
    custom?: Record<string, unknown>;
}

export function createRoomIdentity(
    name: string,
    options: Partial<Omit<RoomIdentity, 'id' | 'name' | 'createdAt' | 'playerIds'>> = {}
): RoomIdentity {
    return {
        id: IdFactory.roomId(),
        name,
        maxPlayers: options.maxPlayers ?? 6,
        playerIds: [],
        settings: options.settings ?? {
            isPrivate: false,
            minBet: 10,
            maxBet: 1000,
            deckCount: 1,
        },
        createdAt: new Date(),
    };
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface PlayerSession {
    /** Session ID */
    id: SessionId;
    
    /** Associated player ID */
    playerId: PlayerId;
    
    /** Device ID if known */
    deviceId?: DeviceId;
    
    /** Current room ID if in a room */
    roomId?: RoomId;
    
    /** Session start time */
    startedAt: Date;
    
    /** Last activity time */
    lastActivityAt: Date;
    
    /** Is the session currently connected? */
    isConnected: boolean;
    
    /** Connection metadata (IP, user agent, etc.) */
    connectionMeta?: Record<string, string>;
}

export function createPlayerSession(
    playerId: PlayerId,
    options: Partial<Omit<PlayerSession, 'id' | 'playerId' | 'startedAt' | 'lastActivityAt'>> = {}
): PlayerSession {
    const now = new Date();
    
    return {
        id: IdFactory.sessionId(),
        playerId,
        deviceId: options.deviceId,
        roomId: options.roomId,
        startedAt: now,
        lastActivityAt: now,
        isConnected: options.isConnected ?? true,
        connectionMeta: options.connectionMeta,
    };
}

