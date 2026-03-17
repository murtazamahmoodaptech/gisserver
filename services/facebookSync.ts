import axios from 'axios';
import { Feedback } from '../models/Feedback';

export const syncFacebookReviews = async () => {
  const PAGE_ID = process.env.FB_PAGE_ID;
  const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

  // Validate credentials
  if (!PAGE_ID || !ACCESS_TOKEN) {
    throw new Error('Facebook credentials are not configured. Set FB_PAGE_ID and FB_ACCESS_TOKEN.');
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/posts?fields=comments{message,from,created_time}&access_token=${ACCESS_TOKEN}`;
    
    console.log("[v0] Fetching Facebook comments from page:", PAGE_ID);
    const response = await axios.get(url, { timeout: 30000 });

    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid response from Facebook API');
    }

    const posts = response.data.data;
    let inserted = 0;
    let skipped = 0;

    for (const post of posts) {
      if (!post.comments || !Array.isArray(post.comments.data)) continue;

      for (const comment of post.comments.data) {
        try {
          // Check if comment already exists
          const exists = await Feedback.findOne({
            externalId: comment.id,
          });

          if (exists) {
            skipped++;
            continue;
          }

          // Create new feedback from Facebook comment
          await Feedback.create({
            name: comment.from?.name || 'Facebook User',
            email: 'facebook@placeholder.com',
            rating: 5, // Default to 5 stars for Facebook comments
            title: 'Facebook Comment',
            feedback: comment.message || '[No message]',
            status: 'pending',
            source: 'facebook',
            externalId: comment.id,
            profileUrl: comment.from?.id ? `https://facebook.com/${comment.from.id}` : null,
          });

          inserted++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error("[v0] Error processing comment:", errMsg);
          // Continue processing other comments even if one fails
        }
      }
    }

    console.log(`[v0] Facebook sync completed: ${inserted} new, ${skipped} skipped`);
    return { inserted, skipped, total: inserted + skipped };
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error('Invalid Facebook Page ID or Access Token');
      } else if (error.response?.status === 401) {
        throw new Error('Facebook Access Token expired or revoked');
      } else if (error.response?.status === 403) {
        throw new Error('Permission denied. Check your Facebook app permissions.');
      }
    }
    
    throw new Error(`Facebook sync failed: ${errMsg}`);
  }
};
