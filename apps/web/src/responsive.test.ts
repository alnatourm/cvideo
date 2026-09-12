import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

describe('responsive navigation', () => {
  it('keeps account access visible while hiding only section links on small screens', () => {
    expect(styles).toContain('.nav > a[href^="#"] { display: none; }');
    expect(styles).not.toContain('.nav > a:not(.button), .nav > .button { display: none; }');
  });
});
