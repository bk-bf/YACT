import path from 'node:path';

export function getDataDir(): string {
    const configured = process.env.YACT_DATA_DIR?.trim();
    if (configured) {
        return path.isAbsolute(configured)
            ? configured
            : path.join(process.cwd(), configured);
    }

    return path.join(process.cwd(), '.runtime');
}
