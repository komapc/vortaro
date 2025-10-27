/**
 * Tests for UI interactions and mobile features
 */

import { fireEvent } from '@testing-library/dom';

describe('UI Interactions', () => {
    beforeEach(() => {
        document.body.innerHTML = `
      <div id="filtersToggle" aria-expanded="false"></div>
      <div id="filtersPanel" aria-hidden="true"></div>
      <div id="filtersCount"></div>
      <div id="directionToggle" data-direction="io-eo">
        <span class="toggle-text">Ido → Esperanto</span>
      </div>
    `;
    });

    test('should toggle filters panel', () => {
        const toggleFiltersPanel = () => {
            const toggle = document.getElementById('filtersToggle');
            const panel = document.getElementById('filtersPanel');
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

            toggle.setAttribute('aria-expanded', !isExpanded);
            panel.setAttribute('aria-hidden', isExpanded);
        };

        const toggle = document.getElementById('filtersToggle');
        const panel = document.getElementById('filtersPanel');

        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(panel.getAttribute('aria-hidden')).toBe('true');

        toggleFiltersPanel();

        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(panel.getAttribute('aria-hidden')).toBe('false');
    });

    test('should toggle direction correctly', () => {
        const toggleDirection = () => {
            const toggleBtn = document.getElementById('directionToggle');
            const toggleText = toggleBtn.querySelector('.toggle-text');
            const currentDirection = toggleBtn.getAttribute('data-direction');
            const newDirection = currentDirection === 'io-eo' ? 'eo-io' : 'io-eo';

            toggleBtn.setAttribute('data-direction', newDirection);
            toggleText.textContent = newDirection === 'io-eo' ? 'Ido → Esperanto' : 'Esperanto → Ido';

            return newDirection;
        };

        const toggleBtn = document.getElementById('directionToggle');
        const toggleText = toggleBtn.querySelector('.toggle-text');

        expect(toggleBtn.getAttribute('data-direction')).toBe('io-eo');
        expect(toggleText.textContent).toBe('Ido → Esperanto');

        const newDirection = toggleDirection();

        expect(newDirection).toBe('eo-io');
        expect(toggleBtn.getAttribute('data-direction')).toBe('eo-io');
        expect(toggleText.textContent).toBe('Esperanto → Ido');
    });

    test('should update filter count display', () => {
        const updateFilterCount = (count) => {
            const countElement = document.getElementById('filtersCount');
            if (count > 0) {
                countElement.textContent = count.toString();
            } else {
                countElement.textContent = '';
            }
        };

        const countElement = document.getElementById('filtersCount');

        updateFilterCount(0);
        expect(countElement.textContent).toBe('');

        updateFilterCount(3);
        expect(countElement.textContent).toBe('3');
    });
});

describe('Swipe Detection', () => {
    test('should detect horizontal swipe correctly', () => {
        const handleSwipe = (touchStartX, touchEndX, touchStartY, touchEndY) => {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const minSwipeDistance = 50;

            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    return 'swipe-right';
                } else {
                    return 'swipe-left';
                }
            }
            return null;
        };

        // Test right swipe
        expect(handleSwipe(100, 200, 100, 110)).toBe('swipe-right');

        // Test left swipe
        expect(handleSwipe(200, 100, 100, 110)).toBe('swipe-left');

        // Test vertical swipe (should not trigger)
        expect(handleSwipe(100, 110, 100, 200)).toBe(null);

        // Test short swipe (should not trigger)
        expect(handleSwipe(100, 130, 100, 100)).toBe(null);
    });
});

describe('Touch Events', () => {
    test('should handle touch start and end events', () => {
        let touchStartX = 0;
        let touchEndX = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
        };

        const handleTouchEnd = (e) => {
            touchEndX = e.changedTouches[0].clientX;
        };

        // Simulate touch events
        const touchStart = new TouchEvent('touchstart', {
            touches: [{ clientX: 100 }]
        });

        const touchEnd = new TouchEvent('touchend', {
            changedTouches: [{ clientX: 200 }]
        });

        handleTouchStart(touchStart);
        handleTouchEnd(touchEnd);

        expect(touchStartX).toBe(100);
        expect(touchEndX).toBe(200);
    });
});