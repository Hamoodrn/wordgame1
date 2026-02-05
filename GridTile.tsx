import { SelectionMode } from '../types';

interface GridTileProps {
  letter: string;
  row: number;
  col: number;
  isSelected: boolean;
  isDisabled: boolean;
  onInteract: (row: number, col: number, isInitial: boolean) => void;
  selectionMode: SelectionMode;
}

export default function GridTile({
  letter,
  row,
  col,
  isSelected,
  isDisabled,
  onInteract,
  selectionMode
}: GridTileProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectionMode === 'hold') {
      onInteract(row, col, true);
    }
  };

  const handleClick = () => {
    if (selectionMode === 'click') {
      if (isSelected) {
        onInteract(row, col, false);
      } else {
        onInteract(row, col, true);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (selectionMode === 'hold') {
      onInteract(row, col, true);
    } else {
      if (isSelected) {
        onInteract(row, col, false);
      } else {
        onInteract(row, col, true);
      }
    }
  };

  return (
    <div
      data-tile="true"
      data-row={row}
      data-col={col}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      className={`
        aspect-square rounded-xl flex items-center justify-center text-2xl font-bold
        transition-all duration-150 cursor-pointer select-none touch-none
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isSelected
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white scale-95 shadow-lg'
          : 'bg-gradient-to-br from-slate-700 to-slate-600 text-white hover:scale-105 hover:shadow-xl'
        }
      `}
    >
      {letter}
    </div>
  );
}
