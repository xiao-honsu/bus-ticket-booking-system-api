/**
 * Extract cookie domain from URL
 * https://chineseaudio.io.vn → .chineseaudio.io.vn
 * http://localhost:3000 → undefined (for development)
 */
export const getCookieDomain = (url: string): string | undefined => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    // Development: localhost không cần domain
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return undefined;
    }

    // Production: thêm dấu chấm đầu cho subdomain sharing
    // chineseaudio.io.vn → .chineseaudio.io.vn
    return `.${hostname}`;
  } catch (error) {
    console.error('Invalid FRONTEND_URL:', error);
    return undefined;
  }
};
