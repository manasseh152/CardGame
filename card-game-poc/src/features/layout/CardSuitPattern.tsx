import { Spade, Heart, Diamond, Club } from 'lucide-react';

export function CardSuitPattern() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-transparent to-amber-950/10" />
            
            {/* Floating suits with varied opacities */}
            <div className="absolute -top-10 -left-10 text-[400px] rotate-12 opacity-[0.02] text-white">
                <Spade />
            </div>
            <div className="absolute top-1/4 -right-20 text-[300px] -rotate-12 opacity-[0.03] text-rose-500">
                <Heart />
            </div>
            <div className="absolute bottom-1/4 -left-16 text-[250px] rotate-45 opacity-[0.025] text-rose-500">
                <Diamond />
            </div>
            <div className="absolute -bottom-10 right-1/4 text-[350px] -rotate-6 opacity-[0.02] text-white">
                <Club />
            </div>
            
            {/* Additional smaller suits for depth */}
            <div className="absolute top-1/3 left-1/4 text-[150px] rotate-[30deg] opacity-[0.015] text-emerald-400">
                <Spade />
            </div>
            <div className="absolute bottom-1/3 right-1/3 text-[180px] -rotate-[20deg] opacity-[0.015] text-amber-400">
                <Club />
            </div>
        </div>
    );
}

