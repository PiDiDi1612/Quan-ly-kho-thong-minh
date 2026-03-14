import { vi } from 'vitest';

export default function mockDatabase() {
    return {
        pragma: vi.fn(),
        exec: vi.fn(),
        prepare: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ count: 0 }),
            all: vi.fn().mockReturnValue([]),
            run: vi.fn().mockReturnValue({ changes: 0 })
        })
    };
}
