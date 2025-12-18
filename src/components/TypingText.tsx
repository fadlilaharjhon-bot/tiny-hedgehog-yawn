import React from 'react';
import { cn } from '@/lib/utils';

interface TypingTextProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Delay in seconds
}

const TypingText: React.FC<TypingTextProps> = ({ children, className, delay = 0 }) => {
  // Hitung jumlah karakter untuk menentukan langkah animasi yang tepat
  const textContent = typeof children === 'string' ? children : '';
  const charCount = textContent.length > 0 ? textContent.length : 40;
  
  // Durasi animasi dihitung berdasarkan jumlah karakter (misal: 0.05s per karakter)
  const duration = Math.max(1.5, charCount * 0.05); 

  return (
    <div 
      className={cn("typing-text border-r-4 border-transparent pr-1", className)}
      style={{
        animation: `typing ${duration}s steps(${charCount}, end) forwards`,
        animationDelay: `${delay}s`,
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      {children}
    </div>
  );
};

export default TypingText;