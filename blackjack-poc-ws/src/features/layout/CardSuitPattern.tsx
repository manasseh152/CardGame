import { Spade, Heart, Diamond, Club } from 'lucide-react';

export function CardSuitPattern() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
            <div className="absolute -top-10 -left-10 text-[400px] rotate-12">
                <Spade />
            </div>
            <div className="absolute top-1/4 -right-20 text-[300px] -rotate-12">
                <Heart />
            </div>
            <div className="absolute bottom-1/4 -left-16 text-[250px] rotate-45">
                <Diamond />
            </div>
            <div className="absolute -bottom-10 right-1/4 text-[350px] -rotate-6">
                <Club />
            </div>
        </div>
    );
}

