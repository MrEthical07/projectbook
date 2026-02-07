<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { store } from "$lib/stores.svelte";

    onMount(() => {
        store.logout();
        const t = setTimeout(() => {
            goto("/");
        }, 1500);
        return () => clearTimeout(t);
    });
</script>

<div class="flex h-screen w-full items-center justify-center bg-muted/20">
    <div class="flex flex-col items-center gap-4 text-center">
        <h1 class="text-2xl font-semibold">Logout Successful</h1>
        <p class="text-muted-foreground">You have been logged out securely. Redirecting...</p>
    </div>
</div>
