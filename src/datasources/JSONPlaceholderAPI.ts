import fetch from 'node-fetch';
import DataLoader from 'dataloader';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
}

export interface Comment {
  id: number;
  postId: number;
  name: string;
  email: string;
  body: string;
}

export class JSONPlaceholderAPI {
  private postLoader: DataLoader<number, Post | null>;
  private userLoader: DataLoader<number, User | null>;
  private commentLoader: DataLoader<number, Comment | null>;

  constructor() {
    this.postLoader = new DataLoader(async (ids) => {
      const posts = await this.fetchPosts();
      return ids.map((id) => posts.find((post) => post.id === id) || null);
    });

    this.userLoader = new DataLoader(async (ids) => {
      const users = await this.fetchUsers();
      return ids.map((id) => users.find((user) => user.id === id) || null);
    });

    this.commentLoader = new DataLoader(async (ids) => {
      const comments = await this.fetchComments();
      return ids.map((id) => comments.find((comment) => comment.id === id) || null);
    });
  }

  async fetchPosts(limit?: number): Promise<Post[]> {
    const response = await fetch(`${BASE_URL}/posts`);
    const posts = (await response.json()) as Post[];
    return limit ? posts.slice(0, limit) : posts;
  }

  async getPost(id: number): Promise<Post | null> {
    return this.postLoader.load(id);
  }

  async fetchUsers(limit?: number): Promise<User[]> {
    const response = await fetch(`${BASE_URL}/users`);
    const users = (await response.json()) as User[];
    return limit ? users.slice(0, limit) : users;
  }

  async getUser(id: number): Promise<User | null> {
    return this.userLoader.load(id);
  }

  async fetchComments(postId?: number): Promise<Comment[]> {
    const url = postId ? `${BASE_URL}/comments?postId=${postId}` : `${BASE_URL}/comments`;
    const response = await fetch(url);
    return (await response.json()) as Comment[];
  }

  async getComment(id: number): Promise<Comment | null> {
    return this.commentLoader.load(id);
  }

  async getPostsByUserId(userId: number): Promise<Post[]> {
    const response = await fetch(`${BASE_URL}/posts?userId=${userId}`);
    return (await response.json()) as Post[];
  }
}
