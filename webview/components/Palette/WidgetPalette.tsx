import React, { useState } from 'react';
import { widgetCategories, widgetDefinitions } from '../../config/widgetDefinitions';
import { DraggableWidget } from './DraggableWidget';
import './WidgetPalette.css';

export const WidgetPalette: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(widgetCategories.map(c => c.name))
  );

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  return (
    <div className="widget-palette">
      <div className="palette-header">
        <h3>Widgets</h3>
      </div>

      <div className="palette-content">
        {widgetCategories.map(category => {
          const isExpanded = expandedCategories.has(category.name);

          return (
            <div key={category.name} className="palette-category">
              <div
                className="category-header"
                onClick={() => toggleCategory(category.name)}
              >
                <span className="category-icon">
                  {isExpanded ? '▼' : '▶'}
                </span>
                <span className="category-name">{category.name}</span>
                <span className="category-count">({category.widgets.length})</span>
              </div>

              {isExpanded && (
                <div className="category-widgets">
                  {category.widgets.map(widgetType => {
                    const definition = widgetDefinitions[widgetType];
                    if (!definition) return null;

                    return (
                      <DraggableWidget
                        key={widgetType}
                        definition={definition}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
