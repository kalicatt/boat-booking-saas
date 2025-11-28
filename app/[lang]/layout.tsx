// Global CSS is already imported in root layout; avoid duplicate import here.
import { ReactNode } from 'react';

// 1. Définition du type avec Promise pour params (Spécifique Next.js 15)
interface LangLayoutProps {
  children: ReactNode;
  params: Promise<{ lang: string }>; 
}

// 2. Le composant doit être async
export default async function LangLayout({
  children,
  params
}: LangLayoutProps) {

  // 3. On await les params pour satisfaire Next.js, même si on n'utilise pas 'lang' ici
  await params; 

  return (
    // Conteneur vitrine en mode clair uniquement
    <div className="relative antialiased text-slate-900 min-h-screen overflow-x-hidden bg-[#f5fbff]">
      {/* Parallax water background layer */}
      <div
        id="sn-water-bg"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        suppressHydrationWarning={true}
        style={{
          backgroundRepeat: 'repeat',
          backgroundSize: '1600px 1200px',
          filter: 'saturate(1.1) contrast(1.02)'
        }}
      />
      {children}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var bg = document.getElementById('sn-water-bg');
              if(!bg) return;
              var svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">'
                + '<defs>'
                  + '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
                    + '<stop offset="0" stop-color="#e6f2ff"/>'
                    + '<stop offset="1" stop-color="#f5fbff"/>'
                  + '</linearGradient>'
                + '</defs>'
                + '<rect width="1600" height="1200" fill="url(#g)"/>'
                + '<g fill="none" stroke="#bfe0ff" stroke-width="2" opacity="0.5">'
                  + '<path d="M0 150 Q400 120 800 150 T1600 150" />'
                  + '<path d="M0 300 Q350 270 800 300 T1600 300" />'
                  + '<path d="M0 450 Q450 420 800 450 T1600 450" />'
                  + '<path d="M0 600 Q300 570 800 600 T1600 600" />'
                  + '<path d="M0 750 Q380 720 800 750 T1600 750" />'
                  + '<path d="M0 900 Q420 870 800 900 T1600 900" />'
                + '</g>'
              + '</svg>';
              var svg = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
              bg.style.backgroundImage = 'url(' + svg + ')';
              bg.style.backgroundRepeat = 'repeat';
              bg.style.backgroundSize = '1600px 1200px';
              var lastY = 0; var rafId = null;
              var update = function(y){
                var offsetY = Math.round(y * 0.25);
                var offsetX = Math.round(y * 0.05);
                bg.style.backgroundPosition = offsetX + 'px ' + offsetY + 'px';
              };
              var onScroll = function(){
                lastY = window.scrollY || window.pageYOffset || 0;
                if(rafId) return;
                rafId = requestAnimationFrame(function(){ rafId = null; update(lastY); });
              };
              // Initialize after hydration to avoid SSR/client mismatch
              requestAnimationFrame(function(){ onScroll(); });
              window.addEventListener('scroll', onScroll, { passive: true });
            })();
          `,
        }}
      />
      
    </div>
  );
}