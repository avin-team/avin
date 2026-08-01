import { Alert, AlertDescription, AlertTitle } from "@avin/ui/components/alert";
import { Badge } from "@avin/ui/components/badge";
import { Button } from "@avin/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@avin/ui/components/card";
import { Input } from "@avin/ui/components/input";
import { Label } from "@avin/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avin/ui/components/select";
import { Skeleton } from "@avin/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ExternalLink,
  FileEdit,
  FolderKanban,
  GraduationCap,
  Loader2,
  Plus,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { Shell } from "@/components/shell";
import { orpc } from "@/utils/orpc";

const TYPE_OPTIONS: { label: string; value: "SERVICE" | "COURSE" }[] = [
  { label: "Service", value: "SERVICE" },
  { label: "Course", value: "COURSE" },
];

export const ListingWorkspacePage = () => {
  const queryClient = useQueryClient();
  const [parentCategoryId, setParentCategoryId] = useState("");
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
        setParentCategoryId("");
        setCategoryId("");
        await queryClient.invalidateQueries({
          queryKey: orpc.listing.sellerWorkspace.listMine.key(),
        });
      },
    })
  );

  const parentCategories: { label: string; value: string }[] =
    categoriesQuery.data?.map((parent) => ({
      label: parent.name,
      value: parent.id,
    })) ?? [];

  const selectedParent = categoriesQuery.data?.find(
    (parent) => parent.id === parentCategoryId
  );

  const subCategories: { label: string; value: string }[] =
    selectedParent?.subCategories.map((sub) => ({
      label: sub.name,
      value: sub.id,
    })) ?? [];

  const renderListingsContent = () => {
    if (listingsQuery.isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      );
    }

    if (listingsQuery.data?.length) {
      return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listingsQuery.data.map((listing) => (
            <li key={listing.id}>
              <Card className="flex h-full flex-col justify-between transition-shadow hover:shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 font-medium">
                      <Link
                        className="transition-colors hover:text-primary hover:underline"
                        params={{ id: listing.slug ?? listing.id }}
                        to="/listing/$id"
                      >
                        {listing.title ?? "Untitled draft"}
                      </Link>
                    </CardTitle>
                    <Badge
                      variant={
                        listing.status === "PUBLISHED" ? "default" : "outline"
                      }
                    >
                      {listing.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {listing.type === "COURSE" ? (
                      <GraduationCap className="size-3.5" />
                    ) : (
                      <Wrench className="size-3.5" />
                    )}
                    <span>{listing.type}</span>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-border/40 pt-3">
                  <Link
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    params={{ id: listing.slug ?? listing.id }}
                    to="/listing/$id"
                  >
                    <span>View listing</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center">
        <FileEdit className="size-10 text-muted-foreground/60 mb-2" />
        <p className="font-medium text-muted-foreground">No listings yet</p>
        <p className="text-xs text-muted-foreground/80 mt-1">
          Create a draft above to get started.
        </p>
      </Card>
    );
  };

  return (
    <Shell variant="default">
      <div className="space-y-8">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              My listing drafts
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create a private draft and complete it before publishing.
          </p>
        </header>

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="size-5 text-primary" />
              Create new draft
            </CardTitle>
            <CardDescription>
              Select a category and type to begin setting up your listing.
            </CardDescription>
          </CardHeader>
          <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!categoryId) {
                return;
              }
              createMutation.mutate({ categoryId, title: title || null, type });
            }}
          >
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="listing-type">Type</Label>
                <Select
                  items={TYPE_OPTIONS}
                  onValueChange={(val) =>
                    val && setType(val as "SERVICE" | "COURSE")
                  }
                  value={type}
                >
                  <SelectTrigger id="listing-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICE">
                      <span className="flex items-center gap-2">
                        <Wrench className="size-4 text-muted-foreground" />
                        Service
                      </span>
                    </SelectItem>
                    <SelectItem value="COURSE">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="size-4 text-muted-foreground" />
                        Course
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="listing-parent-category">Category</Label>
                <Select
                  disabled={categoriesQuery.isLoading}
                  items={parentCategories}
                  onValueChange={(val) => {
                    setParentCategoryId(val ?? "");
                    setCategoryId("");
                  }}
                  value={parentCategoryId}
                >
                  <SelectTrigger
                    id="listing-parent-category"
                    className="w-full"
                  >
                    <SelectValue
                      placeholder={
                        categoriesQuery.isLoading
                          ? "Loading categories..."
                          : "Choose a category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {parentCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="listing-category">Sub-category</Label>
                <Select
                  disabled={!parentCategoryId || categoriesQuery.isLoading}
                  items={subCategories}
                  onValueChange={(val) => setCategoryId(val ?? "")}
                  value={categoryId}
                >
                  <SelectTrigger id="listing-category" className="w-full">
                    <SelectValue
                      placeholder={
                        parentCategoryId
                          ? "Choose a sub-category"
                          : "Select a category first"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {sub.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="listing-title">Working title (optional)</Label>
                <Input
                  id="listing-title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="You can finish this later"
                  value={title}
                />
              </div>

              {createMutation.isError ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Unable to create this draft. Please try again.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                className="w-full sm:w-auto"
                disabled={!categoryId || createMutation.isPending}
                type="submit"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus className="size-4" />
                    Create private draft
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <section aria-labelledby="draft-list-heading" className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold" id="draft-list-heading">
              Your listings
            </h2>
            {listingsQuery.data?.length ? (
              <Badge variant="secondary">{listingsQuery.data.length}</Badge>
            ) : null}
          </div>

          {renderListingsContent()}
        </section>
      </div>
    </Shell>
  );
};
