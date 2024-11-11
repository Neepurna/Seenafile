import * as rssParser from 'react-native-rss-parser';
import { RSSItem } from '../types/rss';

const RSS_FEEDS = {
  movies: 'https://movieweb.com/feed/',
  movieNews: 'https://variety.com/feed/?post_type=movie',
  backupFeed: 'https://www.slashfilm.com/feed/'
};

const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const sanitizeXML = (xml: string): string => {
  return xml
    // Remove BOM and invalid characters
    .replace(/^\uFEFF/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    // Handle XML entities
    .replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;')
    // Handle CDATA sections more carefully
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (match, content) => {
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .trim();
    })
    // Fix problematic tags
    .replace(/<dc:creator>/g, '<creator>')
    .replace(/<\/dc:creator>/g, '</creator>')
    .replace(/<content:encoded>/g, '<contentEncoded>')
    .replace(/<\/content:encoded>/g, '</contentEncoded>')
    .replace(/<wp:post_id>/g, '<postId>')
    .replace(/<\/wp:post_id>/g, '</postId>')
    // Remove other problematic WordPress tags
    .replace(/<wp:[^>]+>([\s\S]*?)<\/wp:[^>]+>/g, '')
    // Clean empty attributes
    .replace(/\s(\w+)=(?=\s|>)/g, ' $1=""')
    .trim();
};

const cleanImageUrl = (url: string): string => {
  if (!url) return '';
  // Remove HTML entities
  let cleaned = url.replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'");
  // Ensure HTTPS
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned;
  } else if (cleaned.startsWith('http:')) {
    cleaned = cleaned.replace('http:', 'https:');
  }
  return cleaned;
};

const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      !!parsed.protocol && 
      !!parsed.host && 
      (
        /\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(parsed.pathname) ||
        parsed.pathname.includes('/image/') ||
        parsed.pathname.includes('/media/') ||
        parsed.hostname.includes('img') ||
        parsed.hostname.includes('image') ||
        /\.(googleapis|cloudfront|cloudinary|imgur)\./.test(parsed.hostname)
      )
    );
  } catch {
    return false;
  }
};

const extractImage = (item: rssParser.RSSParserItem): string | null => {
  // Try all possible image sources in order of preference
  const possibleSources = [
    // Check media content
    item.media?.content?.url,
    item.media?.thumbnail?.url,
    // Check enclosures
    ...(item.enclosures?.map(e => e.url) || []),
    // Check thumbnails
    ...(item.thumbnails?.map(t => t.url) || []),
    // Extract from content
    ...(item.content ? extractImagesFromHTML(item.content) : []),
    // Extract from description
    ...(item.description ? extractImagesFromHTML(item.description) : [])
  ];

  // Clean and validate the URL before returning
  const foundUrl = possibleSources.find(url => url && isValidImageUrl(url));
  return foundUrl ? cleanImageUrl(foundUrl) : null;
};

const extractImagesFromHTML = (html: string): string[] => {
  const images: string[] = [];
  
  // Match <img> tags
  const imgRegex = /<img[^>]+src="([^"]+)"/g;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) images.push(match[1]);
  }

  // Match background images
  const bgRegex = /background-image:\s*url\(['"]?([^'")\s]+)/g;
  while ((match = bgRegex.exec(html)) !== null) {
    if (match[1]) images.push(match[1]);
  }

  return images;
};

export const fetchRSSFeeds = async (): Promise<RSSItem[]> => {
  try {
    // Add headers to mimic a browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Try feeds in sequence until one works
    let responseText = '';
    let workingFeed = '';

    for (const [key, url] of Object.entries(RSS_FEEDS)) {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) continue;
        
        const text = await response.text();
        if (text.trim().startsWith('<?xml') || text.trim().startsWith('<rss')) {
          responseText = text;
          workingFeed = key;
          break;
        }
      } catch (e) {
        console.log(`Failed to fetch ${key} feed:`, e);
        continue;
      }
    }

    if (!responseText) {
      throw new Error('No valid RSS feeds available');
    }

    console.log('Using feed:', workingFeed);
    const sanitizedXML = sanitizeXML(responseText);
    const feed = await rssParser.parse(sanitizedXML);
    
    const items = feed.items.map(item => ({
      title: item.title || 'Untitled',
      link: item.links?.[0]?.url || '',
      pubDate: item.published || new Date().toISOString(),
      description: item.description?.replace(/<[^>]*>/g, '').trim() || '',
      source: 'Movie News',
      imageUrl: extractImage(item)
    }));

    const validItems = items
      .filter(item => item.title && item.description)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    console.log('Valid items found:', validItems.length);
    return validItems;

  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return [];
  }
};