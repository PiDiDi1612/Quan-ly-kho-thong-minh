import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('better-sqlite3', () => {
    return {
        default: class mockDatabase {
            pragma() { }
            exec() { }
            prepare() {
                return {
                    get: () => ({ count: 0 }),
                    all: () => [],
                    run: () => ({ changes: 0 })
                }
            }
        }
    };
});
