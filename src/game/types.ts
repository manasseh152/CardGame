/**
 * Game Types
 * 
 * Core type definitions for the card game.
 */

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];

export interface Card<TValue = number> {
    suit: Suit;
    rank: Rank;
    value: TValue;
}

export interface DeckConfig<TValue = number> {
    suits: Suit[];
    ranks: [Rank, TValue][];
    decks: number;
}

export interface PlayerProfile {
    name: string;
    chips: number;
}

export interface Game {
    players: unknown[];
    start(): Promise<void>;
    end(): Promise<void>;
}

// Blackjack-specific types
export const PLAYER_STATUS = ['playing', 'stay', 'bust', 'blackjack'] as const;
export type PlayerStatus = typeof PLAYER_STATUS[number];

export const BLACKJACK_PHASES = ['betting', 'dealing', 'player-turn', 'dealer-turn', 'round-over'] as const;
export type BlackjackPhase = typeof BLACKJACK_PHASES[number];

// Visual constants
export const SUIT_SYMBOLS: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
};

export const DEALER_NAME = 'Dealer';

