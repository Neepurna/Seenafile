import * as rssParser from 'react-native-rss-parser';
import { RSSItem } from '../types/rss';

const RSS_FEEDS = {
  lwliesReviews: 'https://lwlies.com/reviews/feed/'
};

const sanitizeXML = (xml: string): string => {
  return xml
    .replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;')
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/<(\/)?([a-zA-Z0-9]+):([a-zA-Z0-9]+)/g, '<$1$2_$3')
    .trim();
};

const isValidImageUrl = (url: string): boolean => {
  // Check if URL is valid and is an image
  try {
    const parsed = new URL(url);
    return !!parsed.protocol && !!parsed.host && 
           /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const extractImage = (content: string): string | null => {
  // Try multiple patterns to find images
  const patterns = [
    // Featured image pattern
    /<img[^>]+class="[^"]*wp-post-image[^"]*"[^>]+src="([^">]+)"/,
    // Media:content pattern
    /<media:content[^>]+url="([^">]+)"/,
    // Open Graph image pattern
    /<meta property="og:image" content="([^">]+)"/,
    // Standard img tag pattern
    /<img[^>]+src="([^">]+)"/,
    // Background image pattern
    /background-image:\s*url\(['"]?([^'"]+)['"]?\)/
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      // Clean up the URL
      const imageUrl = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&')
        .trim();
      
      if (isValidImageUrl(imageUrl)) {
        console.log('Valid image URL found:', imageUrl);
        return imageUrl;
      }
    }
  }

  return null;
};

export const fetchRSSFeeds = async (): Promise<RSSItem[]> => {
  try {
    const feedPromises = Object.entries(RSS_FEEDS).map(async ([source, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.log(`Failed to fetch ${source}: ${response.status}`);
          return [];
        }
        
        const responseText = await response.text();
        const sanitizedXML = sanitizeXML(responseText);
        
        const feed = await rssParser.parse(sanitizedXML);
        console.log(`Successfully parsed ${source} feed`);
        
        return feed.items.map(item => {
          try {
            // Try multiple sources for images
            let imageUrl = null;
            
            // Try enclosures first
            if (item.enclosures && item.enclosures.length > 0) {
              imageUrl = item.enclosures[0].url;
            }
            
            // Try media:content
            if (!imageUrl && item.links) {
              const mediaLink = item.links.find(link => 
                link.type && link.type.startsWith('image/')
              );
              if (mediaLink) {
                imageUrl = mediaLink.url;
              }
            }
            
            // Try content/description if still no image
            if (!imageUrl) {
              imageUrl = extractImage(item.content || item.description || '');
            }

            console.log(`Image found for "${item.title}":`, imageUrl);

            return {
              title: item.title?.trim() || 'Untitled',
              link: item.links?.[0]?.url || '',
              pubDate: item.published || new Date().toISOString(),
              description: item.description?.trim() || '',
              source,
              imageUrl
            };
          } catch (itemError) {
            console.log(`Error processing item in ${source}:`, itemError);
            return null;
          }
        }).filter(Boolean);
      } catch (feedError) {
        console.log(`Error processing ${source} feed:`, feedError);
        return [];
      }
    });

    const allFeeds = await Promise.all(feedPromises);
    const validFeeds = allFeeds
      .flat()
      .filter(item => item !== null)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    console.log(`Total valid items fetched: ${validFeeds.length}`);
    return validFeeds;
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    return [];
  }
};