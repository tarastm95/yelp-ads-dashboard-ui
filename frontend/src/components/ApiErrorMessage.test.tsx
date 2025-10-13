import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import ApiErrorMessage from './ApiErrorMessage';

describe('ApiErrorMessage', () => {
  it('renders detail message when provided by backend', () => {
    const error = { status: 400, data: { detail: 'Bad request detail' } } as any;
    const html = ReactDOMServer.renderToString(<ApiErrorMessage error={error} />);
    expect(html).toContain('Bad request detail');
  });

  it('renders status and statusText when detail is missing', () => {
    const error = { status: 500, data: {}, statusText: 'Internal Server Error' } as any;
    const html = ReactDOMServer.renderToString(<ApiErrorMessage error={error} />);
    expect(html).toContain('HTTP 500: Internal Server Error');
  });
});
