import React from 'react';
import { SportsMediaBlogHub } from './SportsMediaBlogHub';
import { BlogPost } from './BlogTypes';

interface BlogHubPageProps {
  onSelectArticle?: (post: BlogPost) => void;
}

export const BlogHubPage: React.FC<BlogHubPageProps> = ({ onSelectArticle }) => {
  return <SportsMediaBlogHub onSelectArticle={onSelectArticle} />;
};

export default BlogHubPage;
