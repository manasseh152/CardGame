/**
 * Blackjack Game Module
 * 
 * Full blackjack game implementation with betting, splitting, doubling down.
 * Uses IOAdapter for all input/output operations.
 */

import z from 'zod';
import type { IOAdapter, SelectOption, GameState, PlayerState, CardState } from '../adapters/types';
import type { Card, DeckConfig, Game, BlackjackPhase, PlayerProfile } from './types';
import { DEALER_NAME, SUIT_SYMBOLS } from './types';
import { Deck, BLACKJACK_DECK_CONFIG } from './Deck';
import { BlackjackPlayer } from './Player';

// ============================================================================
// Configuration Schema
// ============================================================================

const playerNameSchema = z.string().refine(
    (name) => name.toLowerCase() !== DEALER_NAME.toLowerCase(),
    { message: `Player name cannot be '${DEALER_NAME}'` }
);

const playerProfileSchema = z.object({
    name: playerNameSchema,
    chips: z.number().positive().optional(),
});

const blackjackConfigSchema = z.object({
    players: z.array(z.union([playerNameSchema, playerProfileSchema])),
    decks: z.number().optional(),
});

type BlackjackConfig = z.infer<typeof blackjackConfigSchema>;

// ============================================================================
// Game State Payload
// ============================================================================

export interface BlackjackGameStatePayload {
    dealer: BlackjackPlayer;
    players: BlackjackPlayer[];
    phase: BlackjackPhase;
    message: string;
}

// ============================================================================
// Blackjack Game
// ============================================================================

export class BlackjackGame implements Game {
    public players: BlackjackPlayer[];
    public dealer: BlackjackPlayer;
    public deck: Deck<number>;
    public phase: BlackjackPhase;
    public currentPlayerIndex: number;
    public isRunning: boolean;
    private message: string;
    private io: IOAdapter;

    constructor(io: IOAdapter, config: BlackjackConfig) {
        this.io = io;
        const { players, decks } = blackjackConfigSchema.parse(config);

        this.dealer = new BlackjackPlayer(DEALER_NAME, { isDealer: true });
        this.players = players.map((pl) => {
            if (typeof pl === 'string') {
                return new BlackjackPlayer(pl);
            } else {
                return new BlackjackPlayer(pl.name, { initialChips: pl.chips ?? 1000 });
            }
        });
        this.deck = this.createDeck(decks);
        this.phase = 'betting';
        this.currentPlayerIndex = 0;
        this.isRunning = false;
        this.message = '';
    }

    private createDeck(decks?: number): Deck<number> {
        const config: DeckConfig<number> = {
            ...BLACKJACK_DECK_CONFIG,
            decks: decks ?? 1,
        };
        return new Deck(config);
    }

    // ========================================================================
    // Hand Calculations
    // ========================================================================

    public calculateHandValue(hand: readonly Card<number>[]): number {
        let value = 0;
        let aces = 0;

        for (const card of hand) {
            value += card.value;
            if (card.rank === 'A') {
                aces++;
            }
        }

        // Convert Aces from 11 to 1 if over 21
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    public isBlackjack(hand: readonly Card<number>[]): boolean {
        return hand.length === 2 && this.calculateHandValue(hand) === 21;
    }

    public isBust(hand: readonly Card<number>[]): boolean {
        return this.calculateHandValue(hand) > 21;
    }

    public getCurrentPlayer(): BlackjackPlayer | undefined {
        return this.players[this.currentPlayerIndex];
    }

    // ========================================================================
    // Game Actions
    // ========================================================================

    public dealInitialCards(): void {
        this.deck.shuffle();

        // Reset all players but preserve their bets
        for (const player of this.players) {
            const savedBet = player.bet;
            player.reset();
            player.bet = savedBet;
        }
        this.dealer.reset();

        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            for (const player of this.players) {
                player.push(this.deck.draw());
            }
            this.dealer.push(this.deck.draw());
        }

        // Check for natural blackjacks
        for (const player of this.players) {
            if (this.isBlackjack(player.hand)) {
                player.status = 'blackjack';
            }
        }

        this.phase = 'player-turn';
        this.currentPlayerIndex = 0;

        // Skip players with blackjack
        this.advanceToNextActivePlayer();
    }

    public playerHit(player: BlackjackPlayer): void {
        if (player.status !== 'playing') return;

        player.push(this.deck.draw());
        const value = this.calculateHandValue(player.hand);

        if (value > 21) {
            player.status = 'bust';
            this.message = `${player.name} busts with ${value}!`;
        } else if (value === 21) {
            player.status = 'stay';
            this.message = `${player.name} has 21!`;
        } else {
            this.message = `${player.name} hits. Hand value: ${value}`;
        }
    }

    public playerStand(player: BlackjackPlayer): void {
        if (player.status !== 'playing') return;

        player.status = 'stay';
        const value = this.calculateHandValue(player.hand);
        this.message = `${player.name} stands on ${value}.`;
    }

    public playerDoubleDown(player: BlackjackPlayer): boolean {
        if (player.status !== 'playing') return false;
        if (!player.canDoubleDown()) {
            this.message = `${player.name} cannot double down.`;
            return false;
        }

        player.chips -= player.bet;
        player.bet *= 2;
        player.push(this.deck.draw());

        const value = this.calculateHandValue(player.hand);

        if (value > 21) {
            player.status = 'bust';
            this.message = `${player.name} doubles down and busts with ${value}!`;
        } else {
            player.status = 'stay';
            this.message = `${player.name} doubles down. Hand value: ${value}`;
        }

        return true;
    }

    public playerSplit(player: BlackjackPlayer): boolean {
        if (player.status !== 'playing') return false;
        
        const splitHand = player.createSplitHand();
        if (!splitHand) {
            this.message = `${player.name} cannot split.`;
            return false;
        }

        // Deal one card to each hand
        player.push(this.deck.draw());
        splitHand.push(this.deck.draw());

        this.message = `${player.name} splits their pair.`;
        return true;
    }

    public placeBet(player: BlackjackPlayer, amount: number): boolean {
        if (this.phase !== 'betting') {
            this.message = 'Betting phase is over.';
            return false;
        }
        if (amount <= 0 || amount > player.chips) {
            this.message = `Invalid bet amount. ${player.name} has ${player.chips} chips.`;
            return false;
        }

        player.bet = amount;
        player.chips -= amount;
        this.message = `${player.name} bets ${amount} chips.`;
        return true;
    }

    private advanceToNextActivePlayer(): void {
        while (this.currentPlayerIndex < this.players.length) {
            const player = this.players[this.currentPlayerIndex]!;
            if (player.status === 'playing') {
                return;
            }
            // Handle split hand
            if (player.splitHand && player.splitHand.status === 'playing') {
                return;
            }
            this.currentPlayerIndex++;
        }

        // All players done, dealer's turn
        if (this.currentPlayerIndex >= this.players.length) {
            this.phase = 'dealer-turn';
        }
    }

    public nextPlayer(): void {
        const currentPlayer = this.getCurrentPlayer();

        // Check if current player has a split hand that needs to be played
        if (currentPlayer?.splitHand && currentPlayer.splitHand.status === 'playing') {
            return;
        }

        this.currentPlayerIndex++;
        this.advanceToNextActivePlayer();
    }

    private checkDealerTurn(): void {
        if (this.phase === 'dealer-turn') {
            this.dealerPlay();
        }
    }

    public dealerPlay(): void {
        if (this.phase !== 'dealer-turn') return;

        // Check if all players busted or got blackjack
        const allPlayersDone = this.players.every(
            (p) => p.status === 'bust' || (p.status === 'blackjack' && !this.isBlackjack(this.dealer.hand))
        );

        if (allPlayersDone) {
            this.dealer.status = 'stay';
            this.message = 'All players busted. Dealer wins.';
            this.phase = 'round-over';
            return;
        }

        // Dealer hits until 17 or higher
        while (this.calculateHandValue(this.dealer.hand) < 17) {
            this.dealer.push(this.deck.draw());
        }

        const dealerValue = this.calculateHandValue(this.dealer.hand);

        if (dealerValue > 21) {
            this.dealer.status = 'bust';
            this.message = `Dealer busts with ${dealerValue}!`;
        } else {
            this.dealer.status = 'stay';
            this.message = `Dealer stands on ${dealerValue}.`;
        }

        this.phase = 'round-over';
    }

    public resolveRound(): Map<BlackjackPlayer, number> {
        const payouts = new Map<BlackjackPlayer, number>();
        const dealerValue = this.calculateHandValue(this.dealer.hand);
        const dealerBlackjack = this.isBlackjack(this.dealer.hand);
        const dealerBust = this.dealer.status === 'bust';

        for (const player of this.players) {
            const payout = this.calculatePayout(player, dealerValue, dealerBlackjack, dealerBust);
            payouts.set(player, payout);
            player.chips += payout;

            // Handle split hand
            if (player.splitHand) {
                const splitPayout = this.calculatePayout(
                    player.splitHand,
                    dealerValue,
                    dealerBlackjack,
                    dealerBust
                );
                payouts.set(player.splitHand, splitPayout);
                player.chips += splitPayout;
            }
        }

        return payouts;
    }

    private calculatePayout(
        player: BlackjackPlayer,
        dealerValue: number,
        dealerBlackjack: boolean,
        dealerBust: boolean
    ): number {
        const playerValue = this.calculateHandValue(player.hand);
        const playerBlackjack = this.isBlackjack(player.hand);
        const bet = player.bet;

        // Player busted
        if (player.status === 'bust') {
            return 0;
        }

        // Both have blackjack = push
        if (playerBlackjack && dealerBlackjack) {
            return bet; // Return bet (push)
        }

        // Player has blackjack (pays 3:2)
        if (playerBlackjack) {
            return bet + Math.floor(bet * 1.5);
        }

        // Dealer has blackjack
        if (dealerBlackjack) {
            return 0;
        }

        // Dealer busted
        if (dealerBust) {
            return bet * 2; // Win pays 1:1
        }

        // Compare values
        if (playerValue > dealerValue) {
            return bet * 2; // Win pays 1:1
        } else if (playerValue === dealerValue) {
            return bet; // Push - return bet
        } else {
            return 0; // Lose
        }
    }

    // ========================================================================
    // Game State
    // ========================================================================

    public getGameState(): BlackjackGameStatePayload {
        return {
            dealer: this.dealer,
            players: this.players,
            phase: this.phase,
            message: this.message,
        };
    }

    // ========================================================================
    // Display Helpers
    // ========================================================================

    private formatCard(card: Card<number>): string {
        const suitSymbol = SUIT_SYMBOLS[card.suit];
        return `${card.rank}${suitSymbol}`;
    }

    private formatHand(player: BlackjackPlayer, hideSecondCard: boolean = false): string {
        const cards = player.hand
            .map((c, i) => {
                if (hideSecondCard && i === 1) return '[?]';
                return this.formatCard(c);
            })
            .join(' ');
        const value = hideSecondCard ? '?' : this.calculateHandValue(player.hand).toString();
        return `${cards} (${value})`;
    }

    private buildPlayerState(player: BlackjackPlayer, hideCards: boolean = false): PlayerState {
        const currentPlayer = this.getCurrentPlayer();
        const hand: CardState[] = player.hand.map((card, index) => ({
            suit: card.suit,
            rank: card.rank,
            hidden: hideCards && index === 1,
        }));

        const state: PlayerState = {
            id: player.id,
            handId: player.handId,
            name: player.name,
            hand,
            handValue: hideCards ? (player.hand[0]?.value ?? 0) : this.calculateHandValue(player.hand),
            bet: player.bet,
            chips: player.chips,
            status: player.status,
            isDealer: player.isDealer,
            isCurrent: player === currentPlayer,
            parentPlayerId: player.parentPlayerId,
        };

        if (player.splitHand) {
            state.splitHand = this.buildPlayerState(player.splitHand, false);
        }

        return state;
    }

    private buildGameState(): GameState {
        const hideDealer = this.phase === 'player-turn';

        return {
            phase: this.phase,
            dealer: this.buildPlayerState(this.dealer, hideDealer),
            players: this.players.map((p) => this.buildPlayerState(p, false)),
            message: this.message,
        };
    }

    private async displayState(): Promise<void> {
        const hideDealer = this.phase === 'player-turn';

        // Send structured game state if adapter supports it
        if (this.io.gameState) {
            await this.io.gameState(this.buildGameState());
        }

        // Build dealer display
        const dealerLine = `Dealer: ${this.formatHand(this.dealer, hideDealer)}`;

        // Build player lines
        const playerLines = this.players
            .map((player) => {
                const isCurrent = player === this.getCurrentPlayer();
                const marker = isCurrent ? '> ' : '  ';

                let line = `${marker}${player.name}: ${this.formatHand(player)}`;
                line += ` | $${player.bet} bet`;
                line += ` | $${player.chips} chips`;
                line += ` | ${player.status}`;

                if (player.splitHand) {
                    line += `\n     Split: ${this.formatHand(player.splitHand)} | ${player.splitHand.status}`;
                }

                return line;
            })
            .join('\n');

        const separator = '-'.repeat(45);
        const tableDisplay = `${dealerLine}\n${separator}\n${playerLines}`;

        await this.io.note(tableDisplay, `Blackjack — ${this.phase.replace('-', ' ').toUpperCase()}`);

        if (this.message) {
            await this.io.log('message', this.message);
        }
    }

    // ========================================================================
    // Game Phases
    // ========================================================================

    private async runBettingPhase(): Promise<boolean> {
        this.message = 'Place your bets!';

        for (const player of this.players) {
            await this.displayState();

            const betResult = await this.io.text({
                message: `${player.name}, enter your bet (chips: ${player.chips}):`,
                placeholder: '50',
                validate: (value) => {
                    const amount = parseInt(value);
                    if (isNaN(amount) || amount <= 0) return 'Must be a positive number';
                    if (amount > player.chips) return `You only have ${player.chips} chips`;
                    return undefined;
                },
            });

            if (betResult.cancelled) {
                return false;
            }

            this.placeBet(player, parseInt(betResult.value));
        }

        // All bets placed, deal cards
        this.dealInitialCards();
        return true;
    }

    private async runPlayerTurn(): Promise<boolean> {
        const player = this.getCurrentPlayer();
        if (!player || player.status !== 'playing') {
            return true;
        }

        await this.displayState();

        const actionOptions: SelectOption<string>[] = [
            { value: 'hit', label: 'Hit', hint: 'Draw another card' },
            { value: 'stand', label: 'Stand', hint: 'Keep current hand' },
        ];

        if (player.canDoubleDown()) {
            actionOptions.push({ value: 'double', label: 'Double Down', hint: 'Double bet, get one card' });
        }
        if (player.canSplit()) {
            actionOptions.push({ value: 'split', label: 'Split', hint: 'Split pair into two hands' });
        }
        actionOptions.push({ value: 'quit', label: 'Quit', hint: 'Exit the game' });

        const actionResult = await this.io.select({
            message: `${player.name}'s turn (Hand: ${this.calculateHandValue(player.hand)}):`,
            options: actionOptions,
        });

        if (actionResult.cancelled) {
            return false;
        }

        switch (actionResult.value) {
            case 'hit':
                this.playerHit(player);
                if (player.status !== 'playing') {
                    this.nextPlayer();
                    this.checkDealerTurn();
                }
                break;
            case 'stand':
                this.playerStand(player);
                this.nextPlayer();
                this.checkDealerTurn();
                break;
            case 'double':
                this.playerDoubleDown(player);
                this.nextPlayer();
                this.checkDealerTurn();
                break;
            case 'split':
                this.playerSplit(player);
                break;
            case 'quit':
                this.isRunning = false;
                return false;
        }

        return true;
    }

    private formatRoundResults(payouts: Map<BlackjackPlayer, number>): string {
        const dealerResult = `Dealer: ${this.formatHand(this.dealer)} — ${this.dealer.status}`;

        const results = this.players
            .map((player) => {
                const payout = payouts.get(player) ?? 0;
                const bet = player.bet;
                const net = payout - bet;
                const result = net > 0 ? `+$${net}` : net < 0 ? `-$${Math.abs(net)}` : 'Push';

                return `${player.name}: ${result} — Now has $${player.chips} chips`;
            })
            .join('\n');

        const separator = '-'.repeat(40);
        return `${dealerResult}\n${separator}\n${results}`;
    }

    private async runRoundOverPhase(): Promise<boolean> {
        const payouts = this.resolveRound();
        await this.displayState();
        await this.io.note(this.formatRoundResults(payouts), 'Round Results');

        // Check if any players are out of chips
        const activePlayers = this.players.filter((pl) => pl.chips > 0);
        if (activePlayers.length === 0) {
            await this.io.log('warning', 'All players are out of chips!');
            return false;
        }

        const actionResult = await this.io.select({
            message: 'What next?',
            options: [
                { value: 'newround', label: 'New Round', hint: 'Play another hand' },
                { value: 'quit', label: 'Quit', hint: 'End the game' },
            ],
        });

        if (actionResult.cancelled || actionResult.value === 'quit') {
            return false;
        }

        // Reset for new round
        this.deck.reset();
        this.deck.shuffle();
        this.phase = 'betting';
        this.currentPlayerIndex = 0;
        this.message = 'New round! Place your bets.';
        for (const player of this.players) {
            player.reset();
        }
        this.dealer.reset();

        return true;
    }

    // ========================================================================
    // Main Game Loop
    // ========================================================================

    public async start(): Promise<void> {
        this.isRunning = true;

        await this.io.log('info', 'Welcome to Blackjack! Try to beat the dealer without going over 21.');

        while (this.isRunning) {
            // Betting phase
            if (this.phase === 'betting') {
                const continueGame = await this.runBettingPhase();
                if (!continueGame) break;
            }

            // Player turns
            while (this.phase === 'player-turn' && this.isRunning) {
                const player = this.getCurrentPlayer();
                if (!player) {
                    this.phase = 'dealer-turn';
                    break;
                }

                const continueGame = await this.runPlayerTurn();
                if (!continueGame) {
                    this.isRunning = false;
                    break;
                }
            }

            // Dealer turn
            if (this.phase === 'dealer-turn' && this.isRunning) {
                const spinner = this.io.spinner();
                spinner.start('Dealer is playing...');
                await new Promise((resolve) => setTimeout(resolve, 1000));
                this.dealerPlay();
                spinner.stop('Dealer finished.');
            }

            // Round over
            if (this.phase === 'round-over' && this.isRunning) {
                const continueGame = await this.runRoundOverPhase();
                if (!continueGame) break;
            }
        }

        await this.end();
    }

    public async end(): Promise<void> {
        this.isRunning = false;

        const standings = this.players
            .sort((a, b) => b.chips - a.chips)
            .map((player, i) => {
                const medal = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`;
                return `${medal} ${player.name}: $${player.chips} chips`;
            })
            .join('\n');

        await this.io.note(standings, 'Final Standings');
        await this.io.outro('Thanks for playing!');
    }
}

