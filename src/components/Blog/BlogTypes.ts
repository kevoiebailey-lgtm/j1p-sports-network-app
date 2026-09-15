export type BlogCategory = 
  | 'Tournament Highlights' 
  | 'Recruiting Guide' 
  | 'Training & Fitness' 
  | 'Media Release' 
  | 'Athlete Spotlight';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary?: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  publishDate: string;
  thumbnailUrl: string;
  coverImageUrl?: string;
  category: BlogCategory;
  readTime?: string;
  likesCount?: number;
  isPublished?: boolean;
  status?: string;
  isFeatured?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export const DEMO_BLOG_POSTS: BlogPost[] = [];

