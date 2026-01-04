/**
 * Deck Module
 * 
 * Manages a deck of cards with shuffle, draw, and reset operations.
 */

import type { Card, DeckConfig, Suit, Rank } from './types';
import { SUITS } from './types';

export const DEFAULT_DECK_CONFIG: DeckConfig<number> = {
    suits: [...SUITS],
    ranks: [
        ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7],
        ['8', 8], ['9', 9], ['10', 10], ['J', 11], ['Q', 12], ['K', 13], ['A', 14],
    ],
    decks: 1,
};

export const BLACKJACK_DECK_CONFIG: DeckConfig<number> = {
    suits: [...SUITS],
    ranks: [
        ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['7', 7],
        ['8', 8], ['9', 9], ['10', 10], ['J', 10], ['Q', 10], ['K', 10], ['A', 11],
    ],
    decks: 1,
};

export class Deck<TValue = number> {
    private cards: Card<TValue>[];
    private config: DeckConfig<TValue>;

    constructor(config: DeckConfig<TValue>) {
        this.config = config;
        this.cards = this.generateDeck(config);
    }

    protected generateDeck(config: DeckConfig<TValue>): Card<TValue>[] {
        const cards: Card<TValue>[] = [];

        for (let deck = 0; deck < config.decks; deck++) {
            for (const suit of config.suits) {
                for (const [rank, value] of config.ranks) {
                    cards.push({ suit, rank, value });
                }
            }
        }

        return cards;
    }

    public shuffle = (): void => {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.cards[i];
            this.cards[i] = this.cards[j]!;
            this.cards[j] = temp!;
        }
    };

    public draw = (): Card<TValue> => {
        return this.cards.pop()!;
    };

    public reset = (): void => {
        this.cards = this.generateDeck(this.config);
    };

    public get remaining(): number {
        return this.cards.length;
    }
}

