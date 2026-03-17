import axios from 'axios';
import { Feedback } from '../models/Feedback';

export const syncFacebookReviews = async () => {
  const PAGE_ID = process.env.FB_PAGE_ID!;
  const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN!;

  const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/posts?fields=comments{message,from,created_time}&access_token=${ACCESS_TOKEN}`;

  const response = await axios.get(url);

  const posts = response.data.data;

  let inserted = 0;

  for (const post of posts) {
    if (!post.comments) continue;

    for (const comment of post.comments.data) {
      try {
        const exists = await Feedback.findOne({
          externalId: comment.id,
        });

        if (exists) continue;

        await Feedback.create({
          name: comment.from?.name || 'Facebook User',
          email: 'facebook@placeholder.com',
          rating: 5,
          title: 'Facebook Comment',
          feedback: comment.message,
          status: 'pending',
          source: 'facebook',
          externalId: comment.id,
          profileUrl: `https://facebook.com/${comment.from?.id}`,
        });

        inserted++;
      } catch (err) {
        console.log('Duplicate or error:', err.message);
      }
    }
  }

  return { inserted };
};