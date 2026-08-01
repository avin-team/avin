import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

export const ListingWorkspacePage = () => {
  const queryClient = useQueryClient();
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"SERVICE" | "COURSE">("SERVICE");
  const categoriesQuery = useQuery(
    orpc.listing.discovery.categories.queryOptions()
  );
  const listingsQuery = useQuery(
    orpc.listing.sellerWorkspace.listMine.queryOptions()
  );
  const createMutation = useMutation(
    orpc.listing.sellerWorkspace.createDraft.mutationOptions({
      onSuccess: async () => {
        setTitle("");
        await queryClient.invalidateQueries({
          queryKey: orpc.listing.sellerWorkspace.listMine.key(),
        });
      },
    })
  );

  const subCategories =
    categoriesQuery.data?.flatMap((parent) =>
      parent.subCategories.map((sub) => ({
        label: `${parent.name} / ${sub.name}`,
        value: sub.id,
      }))
    ) ?? [];

  return (
    <main className="container mx-auto space-y-8 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">My listing drafts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a private draft and complete it before publishing.
        </p>
      </header>

      <form
        className="grid max-w-2xl gap-4 rounded-xl border p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!categoryId) {
            return;
          }
          createMutation.mutate({ categoryId, title: title || null, type });
        }}
      >
        <label
          className="grid gap-2 text-sm font-medium"
          htmlFor="listing-type"
        >
          Type
          <select
            id="listing-type"
            onChange={(event) =>
              setType(event.target.value as "SERVICE" | "COURSE")
            }
            value={type}
          >
            <option value="SERVICE">Service</option>
            <option value="COURSE">Course</option>
          </select>
        </label>
        <label
          className="grid gap-2 text-sm font-medium"
          htmlFor="listing-category"
        >
          Active sub-category
          <select
            id="listing-category"
            onChange={(event) => setCategoryId(event.target.value)}
            value={categoryId}
          >
            <option value="">Choose a sub-category</option>
            {subCategories.map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.label}
              </option>
            ))}
          </select>
        </label>
        <label
          className="grid gap-2 text-sm font-medium"
          htmlFor="listing-title"
        >
          Working title (optional)
          <input
            id="listing-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="You can finish this later"
            value={title}
          />
        </label>
        <button
          disabled={!categoryId || createMutation.isPending}
          type="submit"
        >
          {createMutation.isPending ? "Creating…" : "Create private draft"}
        </button>
        {createMutation.isError ? (
          <p className="text-sm text-destructive" role="alert">
            Unable to create this draft.
          </p>
        ) : null}
      </form>

      <section aria-labelledby="draft-list-heading" className="space-y-3">
        <h2 className="text-lg font-semibold" id="draft-list-heading">
          Your listings
        </h2>
        {listingsQuery.data?.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {listingsQuery.data.map((listing) => (
              <li className="rounded-lg border p-4" key={listing.id}>
                <p className="font-medium">
                  {listing.title ?? "Untitled draft"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {listing.status}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No listings yet.</p>
        )}
      </section>
    </main>
  );
};
