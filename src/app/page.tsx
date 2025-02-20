import Bulks from "@/components/Bulks";
import Key from "@/components/key";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Verify from "@/components/verify";

export default function Home() {
  return (
    <main className="w-full max-w-7xl mx-auto">
      <h1 >Secure ID App</h1>
      <Tabs defaultValue="key">
        <TabsList>
          <TabsTrigger value="key">Key</TabsTrigger>
          <TabsTrigger value="bulks">Bulks</TabsTrigger>
          <TabsTrigger value="verify">Verify</TabsTrigger>
        </TabsList>
        <TabsContent value="key">
          <Key />
        </TabsContent>
        <TabsContent value="bulks">
          <Bulks />
        </TabsContent>
        <TabsContent value="verify">
          <Verify />
        </TabsContent>
      </Tabs>
    </main>
  );
}
