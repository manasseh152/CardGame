/**
 * Player Manager Module
 * 
 * Manages player profiles with add, remove, and chip management.
 * Uses IOAdapter for all input/output operations.
 */

import type { IOAdapter, SelectOption } from '../adapters/types';
import type { PlayerProfile } from './types';
import { DEALER_NAME } from './types';

export class PlayerManager {
    private players: Map<string, PlayerProfile>;
    private defaultChips: number;
    private io: IOAdapter;

    constructor(io: IOAdapter, defaultChips: number = 1000) {
        this.io = io;
        this.players = new Map();
        this.defaultChips = defaultChips;
    }

    // Add a player
    public async addPlayer(name: string, chips?: number): Promise<boolean> {
        if (name.toLowerCase() === DEALER_NAME.toLowerCase()) {
            await this.io.log('error', `Cannot use reserved name '${DEALER_NAME}'.`);
            return false;
        }
        if (this.players.has(name)) {
            await this.io.log('error', `Player '${name}' already exists.`);
            return false;
        }
        this.players.set(name, { name, chips: chips ?? this.defaultChips });
        await this.io.log('success', `Added player ${name} with ${chips ?? this.defaultChips} chips.`);
        return true;
    }

    // Remove a player
    public async removePlayer(name: string): Promise<boolean> {
        if (!this.players.has(name)) {
            await this.io.log('error', `Player '${name}' not found.`);
            return false;
        }
        this.players.delete(name);
        await this.io.log('success', `Removed player ${name}.`);
        return true;
    }

    // Set chips for a player
    public async setChips(name: string, chips: number): Promise<boolean> {
        const player = this.players.get(name);
        if (!player) {
            await this.io.log('error', `Player '${name}' not found.`);
            return false;
        }
        player.chips = chips;
        await this.io.log('success', `Set ${name}'s chips to ${chips}.`);
        return true;
    }

    // Get player profiles for game creation
    public getPlayerProfiles(): PlayerProfile[] {
        return Array.from(this.players.values());
    }

    // Format current players for display
    private formatPlayersDisplay(): string {
        if (this.players.size === 0) {
            return 'No players added yet';
        }

        return Array.from(this.players.values())
            .map((player, i) => `  ${i + 1}. ${player.name} — ${player.chips} chips`)
            .join('\n');
    }

    // Display current players
    private async displayPlayers(): Promise<void> {
        await this.io.note(this.formatPlayersDisplay(), 'Current Players');
    }

    // Run the player manager loop
    public async run(): Promise<PlayerProfile[] | null> {
        await this.io.log('info', 'Add players before starting the game.');

        while (true) {
            await this.displayPlayers();

            const actionOptions: SelectOption<string>[] = [
                { value: 'add', label: 'Add Player', hint: 'Add a new player to the game' },
            ];

            if (this.players.size > 0) {
                actionOptions.push(
                    { value: 'remove', label: 'Remove Player', hint: 'Remove an existing player' },
                    { value: 'setchips', label: 'Set Chips', hint: "Change a player's chip count" },
                    { value: 'start', label: 'Start Game', hint: 'Begin playing blackjack!' }
                );
            }

            actionOptions.push({ value: 'quit', label: 'Quit', hint: 'Exit the game' });

            const actionResult = await this.io.select({
                message: 'What would you like to do?',
                options: actionOptions,
            });

            if (actionResult.cancelled) {
                await this.io.log('warning', 'Operation cancelled.');
                return null;
            }

            const action = actionResult.value;

            switch (action) {
                case 'add': {
                    const nameResult = await this.io.text({
                        message: 'Enter player name:',
                        placeholder: 'Alice',
                        validate: (value) => {
                            if (!value || value.trim().length === 0) return 'Name cannot be empty';
                            if (value.toLowerCase() === DEALER_NAME.toLowerCase())
                                return `Cannot use reserved name '${DEALER_NAME}'`;
                            if (this.players.has(value)) return `Player '${value}' already exists`;
                            return undefined;
                        },
                    });

                    if (nameResult.cancelled) continue;

                    const chipsResult = await this.io.text({
                        message: 'Starting chips:',
                        placeholder: String(this.defaultChips),
                        defaultValue: String(this.defaultChips),
                        validate: (value) => {
                            const num = parseInt(value);
                            if (isNaN(num) || num <= 0) return 'Must be a positive number';
                            return undefined;
                        },
                    });

                    if (chipsResult.cancelled) continue;

                    await this.addPlayer(nameResult.value, parseInt(chipsResult.value));
                    break;
                }

                case 'remove': {
                    const playerOptions: SelectOption<string>[] = Array.from(this.players.values()).map(
                        (pl) => ({
                            value: pl.name,
                            label: `${pl.name} (${pl.chips} chips)`,
                        })
                    );

                    const playerToRemoveResult = await this.io.select({
                        message: 'Select player to remove:',
                        options: playerOptions,
                    });

                    if (playerToRemoveResult.cancelled) continue;

                    await this.removePlayer(playerToRemoveResult.value);
                    break;
                }

                case 'setchips': {
                    const playerOptions: SelectOption<string>[] = Array.from(this.players.values()).map(
                        (pl) => ({
                            value: pl.name,
                            label: `${pl.name} (${pl.chips} chips)`,
                        })
                    );

                    const playerToModifyResult = await this.io.select({
                        message: 'Select player to modify:',
                        options: playerOptions,
                    });

                    if (playerToModifyResult.cancelled) continue;

                    const newChipsResult = await this.io.text({
                        message: `New chip amount for ${playerToModifyResult.value}:`,
                        validate: (value) => {
                            const num = parseInt(value);
                            if (isNaN(num) || num <= 0) return 'Must be a positive number';
                            return undefined;
                        },
                    });

                    if (newChipsResult.cancelled) continue;

                    await this.setChips(playerToModifyResult.value, parseInt(newChipsResult.value));
                    break;
                }

                case 'start': {
                    await this.io.log('success', 'Starting the game!');
                    await this.displayPlayers();
                    return this.getPlayerProfiles();
                }

                case 'quit': {
                    return null;
                }
            }
        }
    }
}

