import { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

export default function Confetti() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = ['#fbbf24', '#60a5fa', '#34d399', '#f87171'];
    const newPieces: ConfettiPiece[] = [];

    for (let i = 0; i < 30; i++) {
      newPieces.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        velocityX: (Math.random() - 0.5) * 2,
        velocityY: Math.random() * 2 + 1,
        rotationSpeed: (Math.random() - 0.5) * 10
      });
    }

    setPieces(newPieces);

    const interval = setInterval(() => {
      setPieces(prev =>
        prev.map(piece => ({
          ...piece,
          y: piece.y + piece.velocityY,
          x: piece.x + piece.velocityX,
          rotation: piece.rotation + piece.rotationSpeed
        })).filter(piece => piece.y < 120)
      );
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPieces([]);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: `${piece.y}%`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            transform: `rotate(${piece.rotation}deg)`,
            opacity: 0.7,
            borderRadius: '2px'
          }}
        />
      ))}
    </div>
  );
}
