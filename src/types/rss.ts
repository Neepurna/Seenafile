export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  imageUrl?: string | null;
}

export interface RSSFeed {
  items: RSSItem[];
  source: string;
}