import { StatusCard } from '@/components/ui/status-card';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';

/**
 * Example usage of the StatusCard compound component pattern
 * 
 * This demonstrates the combination of:
 * - Compound components pattern (using Object.assign)
 * - shadcn-style component structure
 * - Root component as the wrapper
 */
export function StatusCardExample() {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold mb-4">StatusCard Compound Component Examples</h2>
      
      {/* Success variant */}
      <StatusCard variant="success">
        <StatusCard.Header>
          <div className="flex items-center gap-3">
            <StatusCard.Icon>
              <CheckCircle2 />
            </StatusCard.Icon>
            <div>
              <StatusCard.Title>Game Won!</StatusCard.Title>
              <StatusCard.Description>
                You've successfully completed the round
              </StatusCard.Description>
            </div>
          </div>
          <StatusCard.Badge className="bg-emerald-500 text-white">
            Winner
          </StatusCard.Badge>
        </StatusCard.Header>
        <StatusCard.Content>
          <p className="text-sm">Your hand value: 21</p>
        </StatusCard.Content>
        <StatusCard.Footer>
          <span className="text-xs text-muted-foreground">Round #42</span>
        </StatusCard.Footer>
      </StatusCard>

      {/* Warning variant */}
      <StatusCard variant="warning" size="sm">
        <StatusCard.Header>
          <div className="flex items-center gap-2">
            <StatusCard.Icon>
              <AlertTriangle />
            </StatusCard.Icon>
            <StatusCard.Title>Low Chips</StatusCard.Title>
          </div>
        </StatusCard.Header>
        <StatusCard.Content>
          <StatusCard.Description>
            You're running low on chips. Consider buying more.
          </StatusCard.Description>
        </StatusCard.Content>
      </StatusCard>

      {/* Error variant */}
      <StatusCard variant="error">
        <StatusCard.Header>
          <div className="flex items-center gap-3">
            <StatusCard.Icon>
              <XCircle />
            </StatusCard.Icon>
            <div>
              <StatusCard.Title>Bust!</StatusCard.Title>
              <StatusCard.Description>
                Your hand value exceeded 21
              </StatusCard.Description>
            </div>
          </div>
        </StatusCard.Header>
      </StatusCard>

      {/* Info variant */}
      <StatusCard variant="info" size="lg">
        <StatusCard.Header>
          <div className="flex items-center gap-3">
            <StatusCard.Icon>
              <Info />
            </StatusCard.Icon>
            <div>
              <StatusCard.Title>Game Information</StatusCard.Title>
              <StatusCard.Description>
                Welcome to Blackjack! Place your bets to begin.
              </StatusCard.Description>
            </div>
          </div>
        </StatusCard.Header>
        <StatusCard.Content>
          <div className="space-y-2">
            <p className="text-sm">• Minimum bet: $10</p>
            <p className="text-sm">• Maximum bet: $500</p>
            <p className="text-sm">• Dealer stands on 17</p>
          </div>
        </StatusCard.Content>
        <StatusCard.Footer>
          <button className="text-xs text-primary hover:underline">
            Learn more
          </button>
        </StatusCard.Footer>
      </StatusCard>

      {/* Default variant - flexible composition */}
      <StatusCard>
        <StatusCard.Header>
          <StatusCard.Title>Player Stats</StatusCard.Title>
        </StatusCard.Header>
        <StatusCard.Content>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <StatusCard.Description>Games Played</StatusCard.Description>
              <p className="text-2xl font-bold">127</p>
            </div>
            <div>
              <StatusCard.Description>Win Rate</StatusCard.Description>
              <p className="text-2xl font-bold">68%</p>
            </div>
          </div>
        </StatusCard.Content>
      </StatusCard>
    </div>
  );
}

