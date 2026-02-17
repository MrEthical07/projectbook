<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Separator } from "$lib/components/ui/separator";
	import * as Tabs from "$lib/components/ui/tabs";
	import { BookOpen, CheckCircle2, LoaderCircle } from "@lucide/svelte";
	import { superForm } from "sveltekit-superforms";
	import { zod4Client } from "sveltekit-superforms/adapters";
	import { signInSchema, signUpSchema } from "$lib/schemas/auth.schema";
	import type { ActionData, PageProps } from "./$types";

	type AuthTab = "signin" | "signup";

	let { data, form }: PageProps = $props();
	let activeTab = $state<AuthTab>("signin");

	const resolveLoginFormState = () => (form as ActionData | null)?.loginForm ?? data.loginForm;
	const resolveSignupFormState = () => (form as ActionData | null)?.signupForm ?? data.signupForm;

	const loginSuperForm = superForm(
		resolveLoginFormState(),
		{
			id: "sign-in-form",
			validators: zod4Client(signInSchema),
			onUpdated: ({ form: updatedForm }) => {
				if (!updatedForm.valid || updatedForm.message) {
					activeTab = "signin";
				}
			}
		}
	);
	const signupSuperForm = superForm(
		resolveSignupFormState(),
		{
			id: "sign-up-form",
			validators: zod4Client(signUpSchema),
			onUpdated: ({ form: updatedForm }) => {
				if (!updatedForm.valid || updatedForm.message) {
					activeTab = "signup";
				}
			}
		}
	);

	const {
		form: loginForm,
		errors: loginErrors,
		submitting: loginSubmitting,
		enhance: enhanceLogin
	} = loginSuperForm;

	const {
		form: signupForm,
		errors: signupErrors,
		message: signupMessage,
		submitting: signupSubmitting,
		enhance: enhanceSignup
	} = signupSuperForm;

	let signInGoogleLoading = $state(false);
	let signUpGoogleLoading = $state(false);
	let signInGoogleNotice = $state("");
	let signUpGoogleNotice = $state("");

	const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

	const switchToSignIn = () => {
		activeTab = "signin";
	};

	const switchToSignUp = () => {
		activeTab = "signup";
	};

	const signInWithGoogle = async () => {
		signInGoogleNotice = "";
		signInGoogleLoading = true;
		await pause(900);
		signInGoogleLoading = false;
		signInGoogleNotice = "Google OAuth is not configured yet.";
	};

	const signUpWithGoogle = async () => {
		signUpGoogleNotice = "";
		signUpGoogleLoading = true;
		await pause(900);
		signUpGoogleLoading = false;
		signUpGoogleNotice = "Google OAuth is not configured yet.";
	};

</script>

<main class="flex min-h-screen items-center justify-center p-4 sm:p-8">
	<div
		class="grid w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 bg-background/85 shadow-2xl backdrop-blur-sm md:grid-cols-2"
	>
		<section class="hidden flex-col justify-between gap-8 bg-muted/30 p-10 md:flex">
			<div class="flex items-center gap-3">
				<div
					class="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground"
				>
					<BookOpen class="size-5" />
				</div>
				<div>
					<div class="text-sm font-semibold">ProjectBook</div>
					<div class="text-xs text-muted-foreground">Workspace</div>
				</div>
			</div>

			<div class="space-y-4">
				<h1 class="text-3xl font-semibold leading-tight">Design Thinking Workspace</h1>
				<p class="text-sm text-muted-foreground">From empathy to learning - in one place.</p>

				<ul class="space-y-2 pt-2 text-sm text-muted-foreground">
					<li class="flex items-center gap-2">
						<CheckCircle2 class="size-4 text-primary" />
						<span>Structured Design Thinking</span>
					</li>
					<li class="flex items-center gap-2">
						<CheckCircle2 class="size-4 text-primary" />
						<span>Context-preserving workflow</span>
					</li>
					<li class="flex items-center gap-2">
						<CheckCircle2 class="size-4 text-primary" />
						<span>Collaborative project space</span>
					</li>
				</ul>
			</div>

			<div
				class="rounded-xl border border-dashed border-border/70 bg-background/60 p-4 text-xs text-muted-foreground"
			>
				Keep your team aligned from user insights to validated outcomes.
			</div>
		</section>

		<section class="flex items-center justify-center p-4 sm:p-8 md:p-10">
			<div class="w-full max-w-md space-y-4">
				<div class="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 md:hidden">
					<div
						class="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
					>
						<BookOpen class="size-4" />
					</div>
					<div>
						<div class="text-sm font-semibold">ProjectBook</div>
						<div class="text-xs text-muted-foreground">Design Thinking Workspace</div>
					</div>
				</div>

				{#if data.notice}
					<div class="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
						{data.notice}
					</div>
				{/if}

				<Card.Root>
					<Card.Header class="space-y-2">
						<Card.Title class="text-2xl">Welcome</Card.Title>
						<Card.Description>Sign in or create your account to continue.</Card.Description>
					</Card.Header>
					<Card.Content>
						<Tabs.Root bind:value={activeTab} class="w-full">
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="signin">Sign In</Tabs.Trigger>
								<Tabs.Trigger value="signup">Sign Up</Tabs.Trigger>
							</Tabs.List>

							<Tabs.Content value="signin" class="mt-4 space-y-4">
								<form
									method="POST"
									action="?/login"
									class="space-y-4"
									use:enhanceLogin
									novalidate
								>
									<div class="space-y-2">
										<Label for="signin-email">Email</Label>
										<Input
											id="signin-email"
											name="email"
											type="email"
											placeholder="name@company.com"
											bind:value={$loginForm.email}
											aria-invalid={$loginErrors.email?.length ? "true" : "false"}
										/>
										{#if $loginErrors.email?.length}
											<p class="text-xs text-destructive">{$loginErrors.email[0]}</p>
										{/if}
									</div>

									<div class="space-y-2">
										<Label for="signin-password">Password</Label>
										<Input
											id="signin-password"
											name="password"
											type="password"
											placeholder="Enter your password"
											bind:value={$loginForm.password}
											aria-invalid={$loginErrors.password?.length ? "true" : "false"}
										/>
										{#if $loginErrors.password?.length}
											<p class="text-xs text-destructive">{$loginErrors.password[0]}</p>
										{/if}
									</div>

									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<input
												id="remember-me"
												name="remember"
												type="checkbox"
												class="size-4 rounded border-input accent-primary"
												bind:checked={$loginForm.remember}
											/>
											<Label for="remember-me" class="text-xs text-muted-foreground"
												>Remember me</Label
											>
										</div>
										<a href="/auth/forgot-password" class="text-xs text-primary hover:underline">
											Forgot Password?
										</a>
									</div>

									{#if $loginErrors._errors?.length}
										<p class="text-xs text-destructive">{$loginErrors._errors[0]}</p>
									{/if}

									<Button class="w-full" type="submit" disabled={$loginSubmitting}>
										{#if $loginSubmitting}
											<LoaderCircle class="size-4 animate-spin" />
											<span>Signing in...</span>
										{:else}
											<span>Sign In</span>
										{/if}
									</Button>
								</form>

								<div class="flex items-center gap-2">
									<Separator class="flex-1" />
									<span class="text-xs text-muted-foreground">or</span>
									<Separator class="flex-1" />
								</div>

								<Button
									class="w-full"
									variant="outline"
									type="button"
									onclick={signInWithGoogle}
									disabled={signInGoogleLoading}
								>
									{#if signInGoogleLoading}
										<LoaderCircle class="size-4 animate-spin" />
										<span>Connecting...</span>
									{:else}
										<svg viewBox="0 0 24 24" class="size-4" aria-hidden="true">
											<path
												fill="#EA4335"
												d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.9 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4 9.6-9.6 0-.6-.1-1.2-.2-1.8z"
											/>
										</svg>
										<span>Sign in with Google</span>
									{/if}
								</Button>
								{#if signInGoogleNotice}
									<p class="text-center text-xs text-muted-foreground">{signInGoogleNotice}</p>
								{/if}

								<p class="text-center text-xs text-muted-foreground">
									Don't have an account?
									<button class="text-primary hover:underline" type="button" onclick={switchToSignUp}>
										Sign up
									</button>
								</p>
							</Tabs.Content>

							<Tabs.Content value="signup" class="mt-4 space-y-4">
								<form
									method="POST"
									action="?/signup"
									class="space-y-4"
									use:enhanceSignup
									novalidate
								>
									<div class="space-y-2">
										<Label for="signup-name">Full Name</Label>
										<Input
											id="signup-name"
											name="name"
											type="text"
											placeholder="Your full name"
											bind:value={$signupForm.name}
											aria-invalid={$signupErrors.name?.length ? "true" : "false"}
										/>
										{#if $signupErrors.name?.length}
											<p class="text-xs text-destructive">{$signupErrors.name[0]}</p>
										{/if}
									</div>

									<div class="space-y-2">
										<Label for="signup-email">Email</Label>
										<Input
											id="signup-email"
											name="email"
											type="email"
											placeholder="name@company.com"
											bind:value={$signupForm.email}
											aria-invalid={$signupErrors.email?.length ? "true" : "false"}
										/>
										{#if $signupErrors.email?.length}
											<p class="text-xs text-destructive">{$signupErrors.email[0]}</p>
										{/if}
									</div>

									<div class="space-y-2">
										<Label for="signup-password">Password</Label>
										<Input
											id="signup-password"
											name="password"
											type="password"
											placeholder="Min 10 chars with upper, lower, number, special"
											bind:value={$signupForm.password}
											aria-invalid={$signupErrors.password?.length ? "true" : "false"}
										/>
										{#if $signupErrors.password?.length}
											<p class="text-xs text-destructive">{$signupErrors.password[0]}</p>
										{/if}
									</div>

									<div class="space-y-2">
										<Label for="signup-confirm-password">Confirm Password</Label>
										<Input
											id="signup-confirm-password"
											name="confirmPassword"
											type="password"
											placeholder="Re-enter password"
											bind:value={$signupForm.confirmPassword}
											aria-invalid={$signupErrors.confirmPassword?.length ? "true" : "false"}
										/>
										{#if $signupErrors.confirmPassword?.length}
											<p class="text-xs text-destructive">{$signupErrors.confirmPassword[0]}</p>
										{/if}
									</div>

									{#if $signupErrors._errors?.length}
										<p class="text-xs text-destructive">{$signupErrors._errors[0]}</p>
									{/if}
									{#if $signupMessage}
										<p class="text-xs text-emerald-600">{$signupMessage}</p>
									{/if}

									<Button class="w-full" type="submit" disabled={$signupSubmitting}>
										{#if $signupSubmitting}
											<LoaderCircle class="size-4 animate-spin" />
											<span>Creating account...</span>
										{:else}
											<span>Create Account</span>
										{/if}
									</Button>
								</form>

								<div class="flex items-center gap-2">
									<Separator class="flex-1" />
									<span class="text-xs text-muted-foreground">or</span>
									<Separator class="flex-1" />
								</div>

								<Button
									class="w-full"
									variant="outline"
									type="button"
									onclick={signUpWithGoogle}
									disabled={signUpGoogleLoading}
								>
									{#if signUpGoogleLoading}
										<LoaderCircle class="size-4 animate-spin" />
										<span>Connecting...</span>
									{:else}
										<svg viewBox="0 0 24 24" class="size-4" aria-hidden="true">
											<path
												fill="#EA4335"
												d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 2.9 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4 9.6-9.6 0-.6-.1-1.2-.2-1.8z"
											/>
										</svg>
										<span>Sign up with Google</span>
									{/if}
								</Button>
								{#if signUpGoogleNotice}
									<p class="text-center text-xs text-muted-foreground">{signUpGoogleNotice}</p>
								{/if}

								<p class="text-center text-xs text-muted-foreground">
									Already have an account?
									<button class="text-primary hover:underline" type="button" onclick={switchToSignIn}>
										Sign in
									</button>
								</p>
							</Tabs.Content>
						</Tabs.Root>
					</Card.Content>
				</Card.Root>
			</div>
		</section>
	</div>
</main>
