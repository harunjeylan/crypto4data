import Key from "@/components/key";
import Hash from "@/components/hash";
import Verify from "@/components/verify";

export default function Home() {
  return (
    <main >
      <h1 >Secure ID App</h1>
      <div className="w-full max-w-7xl mx-auto flex gap-8 justify-around">
        <section className="w-full border rounded-md p-4">
          <Key />
        </section>
        <section className="w-full border rounded-md p-4">
          <Hash />
        </section>
        <section className="w-full border rounded-md p-4">
          <Verify />
        </section>
      </div>
    </main>
  );
}
