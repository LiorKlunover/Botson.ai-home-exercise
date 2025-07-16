import { FeedsList } from "./components/FeedsList";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">MongoDB Feeds Dashboard</h1>
      
      <div className="mb-8">
        <FeedsList />
      </div>
    </main>
  );
}
