import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ICON_CATEGORIES, ALL_ICONS, IconEntry } from '../../config/iconData';
import { translateLVGLToMDI } from '../../utils/widgetHierarchy';

interface IconPickerProps {
  onSelect: (icon: IconEntry) => void;
  onClose: () => void;
  anchorEl: HTMLElement | null;
}

export const IconPicker: React.FC<IconPickerProps> = ({ onSelect, onClose, anchorEl }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Position popup near the anchor element
  const style = useMemo<React.CSSProperties>(() => {
    if (!anchorEl) return { display: 'none' };
    const rect = anchorEl.getBoundingClientRect();
    const popupWidth = 360;
    const popupHeight = 440;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
    const top = rect.bottom + 4 + popupHeight > window.innerHeight
      ? rect.top - popupHeight - 4
      : rect.bottom + 4;
    return {
      position: 'fixed',
      left,
      top,
      width: popupWidth,
      height: popupHeight,
      zIndex: 9999,
      background: 'var(--vscode-editorWidget-background, #252526)',
      border: '1px solid var(--vscode-panel-border, #454545)',
      borderRadius: '4px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    };
  }, [anchorEl]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorEl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const icons = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (q) return ALL_ICONS.filter(i => i.name.includes(q));
    if (activeCategory) return ICON_CATEGORIES.find(c => c.name === activeCategory)?.icons ?? [];
    return ALL_ICONS;
  }, [search, activeCategory]);

  return (
    <div ref={popupRef} style={style}>
      {/* Search bar */}
      <div style={{ padding: '8px', borderBottom: '1px solid var(--vscode-panel-border, #454545)' }}>
        <input
          autoFocus
          type="text"
          placeholder="Search icons..."
          value={search}
          onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '2px',
            padding: '4px 8px',
            fontSize: '12px',
          }}
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          padding: '4px 8px',
          gap: '4px',
          borderBottom: '1px solid var(--vscode-panel-border, #454545)',
          flexShrink: 0,
        }}>
          <CategoryTab
            label="All"
            active={activeCategory === null}
            onClick={() => setActiveCategory(null)}
          />
          {ICON_CATEGORIES.map(cat => (
            <CategoryTab
              key={cat.name}
              label={cat.name}
              active={activeCategory === cat.name}
              onClick={() => setActiveCategory(cat.name)}
            />
          ))}
        </div>
      )}

      {/* Icon grid */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
        {icons.length === 0 ? (
          <div style={{ fontSize: '12px', opacity: 0.5, textAlign: 'center', marginTop: '24px' }}>
            No icons found
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, 48px)',
            gap: '4px',
          }}>
            {icons.map(icon => (
              <IconCell key={icon.name} icon={icon} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CategoryTab: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '2px 8px',
      fontSize: '11px',
      background: active ? 'var(--vscode-button-background)' : 'transparent',
      color: active ? 'var(--vscode-button-foreground)' : 'var(--vscode-foreground)',
      border: active ? 'none' : '1px solid var(--vscode-panel-border, #454545)',
      borderRadius: '3px',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      textTransform: 'capitalize',
    }}
  >
    {label}
  </button>
);

const IconCell: React.FC<{ icon: IconEntry; onSelect: (icon: IconEntry) => void }> = ({ icon, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const glyph = translateLVGLToMDI(icon.lvgl);

  return (
    <div
      title={icon.name}
      onClick={() => onSelect(icon)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '48px',
        height: '48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        borderRadius: '4px',
        background: hovered ? 'var(--vscode-list-hoverBackground)' : 'transparent',
        fontFamily: "'openHASP Icons', sans-serif",
        fontSize: '22px',
        color: 'var(--vscode-foreground)',
        userSelect: 'none',
      }}
    >
      {glyph}
    </div>
  );
};
