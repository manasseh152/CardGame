/**
 * Player Module
 * 
 * Base player class and Blackjack-specific player class.
 * Uses the identity system for unique identification.
 */

import type { Card, PlayerStatus } from './types';
import { 
    type PlayerId, 
    type HandId,
    type SessionId,
    type RoomId,
    IdFactory,
    type PlayerIdentity,
    createPlayerIdentity,
} from './identity';

// ============================================================================
// Player Options
// ============================================================================

export interface PlayerOptions {
    /** Existing player ID (for reconnection) */
    id?: PlayerId;
    
    /** Session ID for this connection */
    sessionId?: SessionId;
    
    /** Room ID the player is joining */
    roomId?: RoomId;
    
    /** Is this a guest player? */
    isGuest?: boolean;
}

// ============================================================================
// Base Player Class
// ============================================================================

export class Player {
    /** Unique player identifier (persists across sessions) */
    public readonly id: PlayerId;
    
    /** Display name */
    public name: string;
    
    /** Current session ID */
    public sessionId?: SessionId;
    
    /** Current room ID */
    public roomId?: RoomId;
    
    /** Full identity information */
    public readonly identity: PlayerIdentity;
    
    /** Player's hand of cards */
    private cards: Card<number>[];

    constructor(name: string, options: PlayerOptions = {}) {
        this.identity = createPlayerIdentity(name, {
            id: options.id,
            sessionId: options.sessionId,
            roomId: options.roomId,
            isGuest: options.isGuest ?? true,
        });
        
        this.id = this.identity.id;
        this.name = this.identity.name;
        this.sessionId = this.identity.sessionId;
        this.roomId = this.identity.roomId;
        this.cards = [];
    }

    // ========================================================================
    // Card Management
    // ========================================================================

    public push(card: Card<number>): void {
        this.cards.push(card);
    }

    public pop(): Card<number> | undefined {
        return this.cards.pop();
    }

    public clear(): void {
        this.cards = [];
    }

    public get hand(): readonly Card<number>[] {
        return this.cards;
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    /**
     * Update the player's session (e.g., on reconnection)
     */
    public updateSession(sessionId: SessionId): void {
        this.sessionId = sessionId;
        this.identity.sessionId = sessionId;
        this.identity.meta.lastSeenAt = new Date();
    }

    /**
     * Update the player's room
     */
    public joinRoom(roomId: RoomId): void {
        this.roomId = roomId;
        this.identity.roomId = roomId;
    }

    /**
     * Leave the current room
     */
    public leaveRoom(): void {
        this.roomId = undefined;
        this.identity.roomId = undefined;
    }

    // ========================================================================
    // Serialization
    // ========================================================================

    /**
     * Serialize player for network transmission
     */
    public toJSON(): PlayerSnapshot {
        return {
            id: this.id,
            name: this.name,
            sessionId: this.sessionId,
            roomId: this.roomId,
            cardCount: this.cards.length,
        };
    }
}

export interface PlayerSnapshot {
    id: PlayerId;
    name: string;
    sessionId?: SessionId;
    roomId?: RoomId;
    cardCount: number;
}

// ============================================================================
// Blackjack Player Class
// ============================================================================

export interface BlackjackPlayerOptions extends PlayerOptions {
    /** Initial chip count */
    initialChips?: number;
    
    /** Is this the dealer? */
    isDealer?: boolean;
}

export class BlackjackPlayer extends Player {
    /** Current bet amount */
    public bet: number;
    
    /** Player status in the current round */
    public status: PlayerStatus;
    
    /** Split hand (if player has split) */
    public splitHand?: BlackjackPlayer;
    
    /** Whether this is the dealer */
    public readonly isDealer: boolean;
    
    /** Current chip count */
    public chips: number;
    
    /** Unique hand ID (useful for split hands) */
    public readonly handId: HandId;
    
    /** Parent player ID (for split hands) */
    public readonly parentPlayerId?: PlayerId;

    constructor(name: string, options: BlackjackPlayerOptions = {}) {
        // Use special dealer ID for dealer
        const playerId = options.isDealer ? IdFactory.dealerId() : options.id;
        
        super(name, { ...options, id: playerId });
        
        this.bet = 0;
        this.status = 'playing';
        this.isDealer = options.isDealer ?? false;
        this.chips = options.initialChips ?? (options.isDealer ? 0 : 1000);
        this.handId = IdFactory.handId();
    }

    /**
     * Create a split hand from this player's second card
     */
    public createSplitHand(): BlackjackPlayer | null {
        if (!this.canSplit()) return null;
        
        const splitCard = this.pop();
        if (!splitCard) return null;
        
        // Create split hand with same player ID but different hand ID
        const splitHand = new BlackjackPlayer(`${this.name} (Split)`, {
            id: this.id, // Same player ID
            initialChips: 0,
            isDealer: false,
        }) as BlackjackPlayer & { parentPlayerId: PlayerId };
        
        // Set the parent reference
        (splitHand as any).parentPlayerId = this.id;
        
        splitHand.push(splitCard);
        splitHand.bet = this.bet;
        this.chips -= this.bet;
        
        this.splitHand = splitHand;
        
        return splitHand;
    }

    public reset(): void {
        this.clear();
        this.bet = 0;
        this.status = 'playing';
        this.splitHand = undefined;
    }

    public canSplit(): boolean {
        const hand = this.hand;
        return (
            hand.length === 2 &&
            hand[0]!.rank === hand[1]!.rank &&
            !this.splitHand &&
            this.chips >= this.bet
        );
    }

    public canDoubleDown(): boolean {
        return this.hand.length === 2 && this.chips >= this.bet;
    }

    // ========================================================================
    // Serialization
    // ========================================================================

    /**
     * Serialize blackjack player for network transmission
     */
    public override toJSON(): BlackjackPlayerSnapshot {
        return {
            ...super.toJSON(),
            handId: this.handId,
            bet: this.bet,
            status: this.status,
            isDealer: this.isDealer,
            chips: this.chips,
            hasSplitHand: !!this.splitHand,
            parentPlayerId: this.parentPlayerId,
        };
    }
}

export interface BlackjackPlayerSnapshot extends PlayerSnapshot {
    handId: HandId;
    bet: number;
    status: PlayerStatus;
    isDealer: boolean;
    chips: number;
    hasSplitHand: boolean;
    parentPlayerId?: PlayerId;
}
