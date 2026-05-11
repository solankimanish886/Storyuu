import fantasyCandles from '@/assets/covers/fantasy_candles.png';
import scifiWorkshop from '@/assets/covers/scifi_workshop.png';
import fantasy from '@/assets/covers/fantasy.png';
import mystery from '@/assets/covers/mystery.png';
import romance from '@/assets/covers/romance.png';
import scifi from '@/assets/covers/scifi.png';

const ROW_1 = [fantasyCandles, scifiWorkshop, fantasy, mystery, scifi];
const ROW_2 = [romance, scifi, scifiWorkshop, fantasyCandles, mystery];

const MarqueeRow = ({ images, direction = 'left' }: { images: string[], direction?: 'left' | 'right' }) => {
  const animationClass = direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right';
  
  return (
    <div className="flex w-full overflow-hidden mb-1">
      <div className={`flex shrink-0 gap-1 ${animationClass}`}>
        {/* First set of images */}
        {images.map((img, i) => (
          <div key={`row-${direction}-1-${i}`} className="w-[180px] h-[120px] md:w-[280px] md:h-[180px] shrink-0 overflow-hidden relative">
            <img src={img} alt="" className="w-full h-full object-cover" />
            {/* Subtle overlay for contrast */}
            <div className="absolute inset-0 bg-black/10" />
            {/* Occasional badges */}
            {i % 3 === 0 && (
              <span className="absolute top-2 right-2 z-10 text-white font-bold text-[10px] bg-brand-cyan px-2 py-0.5 rounded-sm shadow-sm">
                {direction === 'left' ? 'Read Now' : 'Vote Now'}
              </span>
            )}
          </div>
        ))}
        {/* Duplicate set for seamless looping */}
        {images.map((img, i) => (
          <div key={`row-${direction}-2-${i}`} className="w-[180px] h-[120px] md:w-[280px] md:h-[180px] shrink-0 overflow-hidden relative">
            <img src={img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/10" />
            {i % 3 === 0 && (
              <span className="absolute top-2 right-2 z-10 text-white font-bold text-[10px] bg-brand-cyan px-2 py-0.5 rounded-sm shadow-sm">
                {direction === 'left' ? 'Read Now' : 'Vote Now'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function LoginCollage() {
  return (
    <div className="relative w-full overflow-hidden bg-bg-primary pt-2">
      {/* Top Gradient to blend with status bar */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-bg-primary to-transparent z-10" />

      {/* Row 1: Left to Right */}
      <MarqueeRow images={ROW_1} direction="right" />

      {/* Row 2: Right to Left */}
      <MarqueeRow images={ROW_2} direction="left" />
      
      {/* Fade overlay at bottom of collage */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent z-10" />
    </div>
  );
}
