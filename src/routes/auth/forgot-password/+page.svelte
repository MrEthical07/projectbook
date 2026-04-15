<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { LoaderCircle, Mail } from "@lucide/svelte";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { forgotPasswordSchema } from "$lib/schemas/auth.schema";
	import type { ActionData, PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	const resolveFormState = () => (form as ActionData | null)?.form ?? data.form;

	const forgotPasswordForm = superForm(resolveFormState(), {
		validators: zod4Client(forgotPasswordSchema)
	});
	const {
		form: forgotForm,
		errors: forgotErrors,
		message: forgotMessage,
		submitting: forgotSubmitting,
		enhance: enhanceForgotForm
	} = forgotPasswordForm;
</script>

<svelte:head>
	<title>Forgot Password • ProjectBook</title>
	<meta
		name="description"
		content="Request a password reset OTP for your ProjectBook account."
	/>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="googlebot" content="noindex, nofollow" />
</svelte:head>

<main class="flex min-h-screen items-center justify-center p-4 sm:p-8">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			<div class="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10">
				<Mail class="size-6 text-primary" />
			</div>
			<Card.Title>Forgot Password</Card.Title>
			<Card.Description>Enter your email and we will send a reset code.</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			{#if $forgotMessage}
				<div class="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
					{$forgotMessage}
				</div>
			{/if}

			<form class="space-y-4" method="POST" use:enhanceForgotForm novalidate>
				<div class="space-y-2">
					<Label for="reset-email">Email</Label>
					<Input
						id="reset-email"
						name="email"
						type="email"
						placeholder="name@company.com"
						bind:value={$forgotForm.email}
						aria-invalid={$forgotErrors.email?.length ? "true" : "false"}
					/>
					{#if $forgotErrors.email?.length}
						<p class="text-xs text-destructive">{$forgotErrors.email[0]}</p>
					{/if}
				</div>

				{#if $forgotErrors._errors?.length}
					<p class="text-xs text-destructive">{$forgotErrors._errors[0]}</p>
				{/if}

				<Button class="w-full" type="submit" disabled={$forgotSubmitting}>
					{#if $forgotSubmitting}
						<LoaderCircle class="size-4 animate-spin" />
						<span>Sending...</span>
					{:else}
						<span>Send Reset Code</span>
					{/if}
				</Button>
			</form>

			<Button class="w-full" variant="outline" href="/auth">Back to Login</Button>
		</Card.Content>
	</Card.Root>
</main>
