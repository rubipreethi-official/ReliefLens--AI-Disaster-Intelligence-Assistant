import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SupportItem {
  id: number;
  emoji: string;
  title: string;
  subtitle: string;
}

const items: SupportItem[] = [
  { id: 0, emoji: '🛟', title: 'Quick Disaster Support', subtitle: 'Immediate response protocols active' },
  { id: 1, emoji: '📞', title: 'NGO Helpline', subtitle: 'Connect to verified NGOs nearby' },
  { id: 2, emoji: '🏛️', title: 'Official Support', subtitle: 'Government disaster management' },
  { id: 3, emoji: '🩺', title: 'Medical Aid', subtitle: 'Emergency medical triage' },
  { id: 4, emoji: '🧭', title: 'Rescue Operations', subtitle: 'Search & rescue team dispatch' },
  { id: 5, emoji: '💧', title: 'Relief Camps', subtitle: 'Food, water, and safe shelter' },
  { id: 6, emoji: '⚡', title: 'Stay Calm', subtitle: 'Help is already on the way' },
  { id: 7, emoji: '🌐', title: 'Multilingual AI', subtitle: '99 global dialects supported' },
];

export const SupportCarousel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let scrollPos = 0;

    const step = () => {
      scrollPos += 0.5;
      if (scrollPos >= el.scrollWidth / 2) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      animationId = requestAnimationFrame(step);
    };

    animationId = requestAnimationFrame(step);

    // Pause on hover
    const pause = () => cancelAnimationFrame(animationId);
    const resume = () => { animationId = requestAnimationFrame(step); };

    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);

    return () => {
      cancelAnimationFrame(animationId);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
    };
  }, []);

  // Duplicate items for seamless infinite scrolling
  const allItems = [...items, ...items];

  return (
    <div className="w-full bg-[#0D1117] border-y border-white/[0.04] py-8 overflow-hidden" id="support-carousel">
      <div
        ref={scrollRef}
        className="flex gap-4 px-4 overflow-x-hidden"
        style={{ scrollBehavior: 'auto' }}
      >
        {allItems.map((item, idx) => (
          <motion.div
            key={`${item.id}-${idx}`}
            whileHover={{ scale: 1.03, y: -2 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 w-[220px] px-4 py-4 rounded-2xl bg-[#161B22] border border-white/[0.06] border-l-[3px] border-l-[#00D4FF]/40 flex items-start gap-3 cursor-default hover:border-l-[#00D4FF] hover:bg-[#1C2230] transition-all duration-300"
          >
            <span className="text-xl mt-0.5 shrink-0">{item.emoji}</span>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-bold text-[#E8F4FD] truncate">
                {item.title}
              </span>
              <span className="text-xs text-[#8BA3C7] truncate">
                {item.subtitle}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
