// app/page.tsx

import { revalidatePath } from "next/cache";

import { AuthGetCurrentUserServer, cookiesClient } from "@/utils/amplify-utils";
import AuthenticatorWrapper from "./AuthenticatorWrapper";
import Logout from "@/components/Logout";

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
    <>
      <h1>Hello, Amplify 👋</h1>
      {user && <Logout />}
      <form action={addTodo}>
        <input type="text" name="title" placeholder="Enter a todo item" />
        <button type="submit">Add Todo</button>
      </form>

      <ul>
        {todos && todos.map((todo) => <li key={todo.id}>{todo.content}</li>)}
      </ul>
    </>
  );
}

export default function App() {
  return (
    <AuthenticatorWrapper>
      <TodoApp />
    </AuthenticatorWrapper>
  );
}