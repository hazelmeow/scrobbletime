<script lang="ts">
  import type { Image } from "./lastfm.svelte";

  type Props = { image: Image[] | undefined; size: number; alt: string };
  let { image, size, alt }: Props = $props();

  const PLACEHOLDER =
    "https://lastfm.freetls.fastly.net/i/u/256s/4128a6eb29f94943c9d206c08e625904.jpg";

  let url = $derived.by(() => {
    // there's nothing
    if (!image?.length) {
      return PLACEHOLDER;
    }

    // large
    let found = image.find((i) => i.size === "large");
    if (found) return found["#text"];

    // or maybe medium
    found = image.find((i) => i.size === "medium");
    if (found) return found["#text"];

    // or just the last one
    return image[image.length - 1]["#text"];
  });
</script>

<div style={`max-width: ${size}px; max-height: ${size}px`}>
  <img src={url} {alt} width={size} height={size} />
</div>
