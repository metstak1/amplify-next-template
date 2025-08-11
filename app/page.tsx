// app/page.tsx

import { revalidatePath } from "next/cache";

import { AuthGetCurrentUserServer, cookiesClient } from "@/utils/amplify-utils";
import AuthenticatorWrapper from "./AuthenticatorWrapper";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

async function TodoApp() {
  const user = await AuthGetCurrentUserServer();
  
  // Only fetch todos for the current user (owner-based filtering)
  const { data: todos } = await cookiesClient.models.Todo.list();

  async function addTodo(data: FormData) {
    "use server";
    const title = data.get("title") as string;
    console.log("Adding todo:", title);
    
    try {
      // Get current user for userId
      const currentUser = await AuthGetCurrentUserServer();
      if (!currentUser?.userId) {
        console.error("User not authenticated");
        return;
      }

      // Get user's organization membership (user should have one after onboarding)
      const { data: memberships } = await cookiesClient.models.OrganizationMembership.list({
        filter: { userId: { eq: currentUser.userId } }
      });

      if (!memberships || memberships.length === 0) {
        console.error("User has no organization memberships");
        return;
      }

      // Use user's first organization
      const organizationId = memberships[0].organizationId;

      const response = await cookiesClient.models.Todo.create({
        content: title,
        done: false,
        priority: "medium",
        organizationId: organizationId,
        userId: currentUser.userId,
      });
      
      console.log("Todo added successfully:", response);
    } catch (error) {
      console.error("Error adding todo:", error);
    }
    
    revalidatePath("/");
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Welcome to Your Todo App
        </h1>
        <p className="text-xl text-muted-foreground">
          Stay organized and get things done with ease
        </p>
      </div>

      {/* Add Todo Form */}
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Add New Todo</h2>
        <form action={addTodo} className="flex gap-3">
          <input 
            type="text" 
            name="title" 
            placeholder="Enter a todo item"
            className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            required
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
          >
            Add Todo
          </button>
        </form>
      </div>

      {/* Todo List */}
      <div className="bg-card border rounded-lg shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Your Todos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {todos?.length || 0} {todos?.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="p-6">
          {todos && todos.length > 0 ? (
            <ul className="space-y-3">
              {todos.map((todo) => (
                <li 
                  key={todo.id}
                  className="flex items-center gap-3 p-3 border rounded-md bg-background/50 hover:bg-background transition-colors"
                >
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{todo.content}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      todo.priority === 'high' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        : todo.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {todo.priority}
                    </span>
                    {todo.done && (
                      <span className="text-xs text-muted-foreground">✓ Done</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No todos yet. Add one above to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthenticatorWrapper>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <TodoApp />
          </div>
        </main>
        <Footer />
      </div>
    </AuthenticatorWrapper>
  );
}