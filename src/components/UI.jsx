import { atom, useAtom } from "jotai";
import { useEffect, useState, useCallback } from "react";
import { FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus } from "react-icons/fa";

const pictures = Array.from({ length: 20 }, (_, i) => `${i + 1}`);

export const pageAtom = atom(0);

export const pages = [
  { front: "book-cover", back: pictures[0] },
  ...pictures.slice(1, -1).reduce((acc, _, i, arr) => {
    if (i % 2 === 0) {
      acc.push({ front: arr[i], back: arr[i + 1] });
    }
    return acc;
  }, []),
  { front: pictures[pictures.length - 1], back: "book-back" },
];

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });
  const [isMobile, setIsMobile] = useState(false);

  const checkMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [checkMobile]);

  useEffect(() => {
    new Audio("/audios/page-flip.mp3").play();
  }, [page]);

  const updateVisibleRange = useCallback((currentPage) => {
    const totalPages = pages.length + 1;
    const halfRange = isMobile ? 1 : 2;
    let start = Math.max(0, currentPage - halfRange);
    let end = Math.min(totalPages - 1, start + (isMobile ? 2 : 4));

    if (end - start < (isMobile ? 2 : 4)) {
      start = Math.max(0, end - (isMobile ? 2 : 4));
    }

    setVisibleRange({ start, end });
  }, [isMobile]);

  useEffect(() => {
    updateVisibleRange(page);
  }, [page, isMobile, updateVisibleRange]);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, [setPage]);

  const renderPageButtons = useCallback(() => {
    const createButton = (key, label, pageNum) => (
      <button
        key={key}
        className={`border-transparent hover:border-white transition-all duration-300 px-2 py-2 md:px-4 md:py-3 rounded text-xs md:text-sm uppercase shrink-0 border ${
          pageNum === page ? "bg-white/90 text-black" : "bg-black/30 text-white"
        }`}
        onClick={() => handlePageChange(pageNum)}
      >
        {label}
      </button>
    );

    return [
      createButton("cover", "Cover", 0),
      ...Array.from({ length: visibleRange.end - visibleRange.start + 1 }, (_, i) => {
        const pageNum = i + visibleRange.start;
        return pageNum !== 0 && pageNum !== pages.length
          ? createButton(pageNum, pageNum, pageNum)
          : null;
      }).filter(Boolean),
      createButton("back", "Back", pages.length),
    ];
  }, [page, visibleRange, handlePageChange]);

  const createNavButton = (direction, isDisabled) => (
    <button
      className={`bg-black/30 text-white border-transparent hover:border-white transition-all duration-300 px-2 py-2 md:px-4 md:py-3 rounded text-xs md:text-sm uppercase shrink-0 border ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={() => handlePageChange(direction === 'left' ? Math.max(0, page - 1) : Math.min(pages.length, page + 1))}
      disabled={isDisabled}
    >
      {direction === 'left' ? <FaChevronLeft /> : <FaChevronRight />}
    </button>
  );

  return (
    <main className="pointer-events-none select-none z-10 fixed inset-0 flex justify-between flex-col">
      <a className="pointer-events-auto mt-4 ml-4 md:mt-10 md:ml-10" href="#">
        <img className="w-12 md:w-20" src="/hiking.svg" alt="Hiking logo" />
      </a>
      <div className="w-full overflow-auto pointer-events-auto flex justify-center">
        <div className="overflow-auto flex items-center gap-2 md:gap-4 max-w-full p-4 md:p-10">
          {createNavButton('left', page === 0)}
          {renderPageButtons()}
          {createNavButton('right', page === pages.length)}
        </div>
      </div>
    </main>
  );
};