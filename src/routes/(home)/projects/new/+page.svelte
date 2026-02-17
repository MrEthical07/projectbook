<script lang="ts">
	import AddProjectPage from "../../add-project/+page.svelte";
	let { data } = $props();
</script>

<AddProjectPage {data} />
