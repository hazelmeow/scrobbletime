<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Art from "$lib/Art.svelte";
  import {
    humanizeBigDuration,
    humanizeTotalDuration,
    humanizeTrackDuration,
  } from "$lib/humanize";
  import { calcStats, lastfm, loadLastfm } from "$lib/lastfm.svelte";
  import { onMount } from "svelte";

  let username = $state($page.url.searchParams.get("username") ?? "");
  let period = $state($page.url.searchParams.get("period") ?? "");

  onMount(() => {
    if (username) {
      load(null);
    }
  });

  $effect(() => {
    const params = new URLSearchParams({
      username,
      period,
    });
    goto("/?" + params.toString(), {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  });

  let listMode = $state<"tracks" | "artists">("tracks");
  let sortMode = $state<"duration" | "scrobbles">("duration");

  const initialStats = calcStats([]);
  let stats = $state(initialStats);
  $effect(() => {
    stats = calcStats(lastfm.tracks ?? []);
  });

  let estimateDurations = $state(false);

  let list = $derived.by(() => {
    let l = (
      listMode === "tracks" ? stats.trackStats : stats.artistStats
    ).slice(0);

    if (sortMode === "duration") {
      if (estimateDurations) {
        l = l.sort((a, b) => {
          return b.totalDurationEstimate - a.totalDurationEstimate;
        });
      } else {
        l = l
          .filter((t) => listMode === "artists" || t.duration !== 0)
          .sort((a, b) => {
            return b.totalDuration - a.totalDuration;
          });
      }
    } else {
      if (estimateDurations) {
        l = l.sort((a, b) => {
          return b.playcountEstimate - a.playcountEstimate;
        });
      } else {
        l = l
          .filter((t) => listMode === "artists" || t.duration !== 0)
          .sort((a, b) => {
            return b.playcount - a.playcount;
          });
      }
    }

    return l.slice(0, 1000);
  });

  let animTime = $state(0);
  let padMinutes = $state(false);
  onMount(() => {
    let prevT = 0;
    const animate = (t: number) => {
      let target = estimateDurations
        ? stats.totalDurationEstimate
        : stats.totalDurationMinimum;

      let delta = t - prevT;
      prevT = t;

      if (animTime !== target) {
        padMinutes = true;
        let difference = target - animTime;
        let speed = Math.abs(difference) * 0.05 * (Math.min(delta, 50) / 7);
        if (speed > 100000) {
          speed = 100000;
        }
        if (speed < 10) {
          padMinutes = false;
        }
        if (speed < 0.001) {
          animTime = target;
        } else {
          animTime += speed * Math.sign(difference);
        }
      } else {
        padMinutes = false;
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  });

  const load = (e: Event | null) => {
    e?.preventDefault();
    if (!username) return;
    animTime = 0;
    loadLastfm(username, period);
  };

  const PERIODS = [
    { key: "overall", label: "all time", longLabel: "all time" },
    { key: "7day", label: "7 days", longLabel: "last 7 days" },
    { key: "1month", label: "30 days", longLabel: "last 30 days" },
    { key: "3month", label: "90 days", longLabel: "last 90 days" },
    { key: "6month", label: "180 days", longLabel: "last 180 days" },
    { key: "12month", label: "365 days", longLabel: "last 365 days" },
  ];
</script>

<svelte:head>
  <title>scrobbletime</title>
</svelte:head>

<main>
  <div class="header row">
    <h1 class="logo">scrobbletime</h1>

    <span>brought to you by <a href="https://meows.zip">meows.zip</a></span>
  </div>

  <form class="controls row">
    <input
      type="text"
      placeholder="username"
      autocomplete="off"
      bind:value={username}
    />

    <button type="submit" class="go" onclick={load}>&RightArrow;</button>

    {#if lastfm.loading}
      <em>Loading... {Math.round(lastfm.progress * 100)}%</em>
    {/if}
    {#if lastfm.errored}
      <em>Errored at {Math.round(lastfm.progress * 100)}%</em>
    {/if}
  </form>

  <div class="controls row">
    <div class="periods">
      {#each PERIODS as p}
        <button
          class="linkbutton"
          class:active={period === p.key}
          onclick={() => (period = p.key)}
        >
          {p.label}
        </button>
      {/each}
    </div>
  </div>

  {#if lastfm.tracks?.length}
    <div class="separator"></div>

    <div>
      <div>
        <span class="bold">{lastfm.username}</span>
        <span class="light"> has scrobbled for </span>
        {#if estimateDurations}
          <em class="estimate" title="showing estimates"> about </em>
        {/if}
      </div>
      <div class="big-number">
        {humanizeBigDuration(animTime, padMinutes)}
      </div>
    </div>

    <div class="light">
      {PERIODS.find((p) => p.key === lastfm.period)!.longLabel}
      &nbsp;//&nbsp;
      {stats.totalScrobbles} scrobbles &nbsp;//&nbsp;
      {stats.countTracks} tracks &nbsp;//&nbsp;
      {stats.countArtists} artists &nbsp;//&nbsp;
      {humanizeTrackDuration(stats.averageDuration)} average duration
    </div>

    <br />

    <div>
      {stats.countTracksWithoutDuration} tracks are missing durations. show estimates?
      <button
        class="linkbutton"
        class:active={estimateDurations}
        onclick={() => {
          estimateDurations = true;
        }}
      >
        yes
      </button>
      /
      <button
        class="linkbutton"
        class:active={!estimateDurations}
        onclick={() => {
          estimateDurations = false;
        }}
      >
        no
      </button>
    </div>

    <div class="halfbr"></div>

    <div>
      show
      <button
        class="linkbutton"
        class:active={listMode === "tracks"}
        onclick={() => {
          listMode = "tracks";
        }}
      >
        tracks
      </button>
      /
      <button
        class="linkbutton"
        class:active={listMode === "artists"}
        onclick={() => {
          listMode = "artists";
        }}
      >
        artists
      </button>
      sorted by
      <button
        class="linkbutton"
        class:active={sortMode === "duration"}
        onclick={() => {
          sortMode = "duration";
        }}
      >
        duration
      </button>
      /
      <button
        class="linkbutton"
        class:active={sortMode === "scrobbles"}
        onclick={() => {
          sortMode = "scrobbles";
        }}
      >
        scrobbles
      </button>
    </div>

    <div class="br40px"></div>

    <div class="list" class:artists={listMode === "artists"}>
      {#each list ?? [] as item}
        <!-- <div>
          <Art image={item.image} size={32} alt="art"></Art>
        </div> -->

        <div class="row bold">
          <span class="width-100 ellipsize">
            {item.leftLabel}
          </span>
        </div>

        {#if listMode === "tracks"}
          <div class="row">
            <span class="ellipsize">
              {item.rightLabel}
            </span>
          </div>
        {/if}

        <div class="row right">
          {#if listMode === "tracks"}
            {item.playcount} &times;&nbsp;{#if item.duration === 0}
              <em class="estimate" title="estimated">
                {humanizeTrackDuration(stats.averageDuration)}
              </em>
            {:else}
              {humanizeTrackDuration(item.duration)}
            {/if}&nbsp;&equals;&nbsp;{#if item.duration === 0}
              <em class="estimate" title="estimated">
                {humanizeTotalDuration(item.totalDurationEstimate)}
              </em>
            {:else}
              {humanizeTotalDuration(item.totalDuration)}
            {/if}
          {:else if estimateDurations}
            {item.playcountEstimate} &times;&nbsp;<em
              class="estimate"
              title="average including estimates"
            >
              ~{humanizeTrackDuration(
                Math.round(item.totalDurationEstimate / item.playcount)
              )}
            </em>&nbsp;&equals;&nbsp;<em class="estimate" title="estimated">
              {humanizeTotalDuration(item.totalDurationEstimate)}
            </em>
          {:else}
            {item.playcount} &times;&nbsp;<em class="estimate" title="average">
              ~{humanizeTrackDuration(
                Math.round(item.totalDuration / item.playcount)
              )}
            </em>&nbsp;&equals;
            {humanizeTotalDuration(item.totalDuration)}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  :root {
    --color-separator: #eee;
    --color-bg: #c43029;
  }

  :global(body) {
    display: flex;
    flex-direction: row;
    justify-content: center;
    background-color: var(--color-bg);
  }

  main {
    box-sizing: border-box;
    width: 1000px;
    padding: 40px;
    background-color: white;
    margin: 40px;
    box-shadow: 4px 4px #0003;
  }

  a {
    color: var(--color-bg);
  }
  a:focus-visible {
    outline: 1px solid var(--color-bg);
    outline-offset: 2px;
  }

  .header {
    /* margin-bottom: 14px; */
  }

  .controls {
    gap: 10px;
    margin-top: 10px;
  }

  .logo {
    margin: 0px;
    color: var(--color-bg);
    font-style: italic;
    font-weight: normal;
    flex-grow: 1;
  }

  input {
    color: inherit;
    font: inherit;
    border: none;
    padding: 0px 8px;
    height: 36px;
    outline: 1px solid #aaa;
    box-shadow: 4px 4px #0003;
  }
  input:focus-within {
    outline-color: var(--color-bg);
  }

  .go {
    color: white;
    font: inherit;
    font-weight: bold;
    font-size: 16px;
    border: none;
    padding: 0px 8px;
    width: 34px;
    height: 36px;
    outline: 1px solid var(--color-bg);
    cursor: pointer;
    margin-right: 8px;
    background-color: var(--color-bg);
    box-shadow: 4px 4px #0003;
  }
  .go:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  .go:focus-visible {
    outline-color: white;
  }

  .separator {
    margin: 20px 0px;
    width: 100%;
    height: 1px;
    background-color: var(--color-separator);
  }

  .periods {
    display: flex;
    flex-direction: row;
    gap: 12px;
  }

  .linkbutton {
    background: none;
    color: var(--color-bg);
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    outline: inherit;
  }
  .linkbutton.active {
    text-decoration: 1px underline;
  }
  .linkbutton:focus-visible {
    outline: 1px solid var(--color-bg);
    outline-offset: 2px;
  }

  .big-number {
    font-size: 60px;
    font-weight: bold;
    font-style: italic;
    font-variant-numeric: tabular-nums;
  }

  .list {
    display: grid;
    /* grid-template-columns: min-content 2fr 1fr 200px; */
    grid-template-columns: 2fr 1fr 200px;
  }
  .list.artists {
    grid-template-columns: 1fr min-content;
  }
  .list .right {
    justify-content: flex-end;

    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .estimate {
    color: #aaa;
    text-decoration: underline dotted;
  }

  .list > * {
    --row-gap: 6px;
    --col-gap: 3px;

    padding-left: var(--col-gap);
    padding-right: var(--col-gap);
    padding-bottom: var(--row-gap);
    margin-top: var(--row-gap);
    border-bottom: 1px solid var(--color-separator);

    overflow: hidden;
  }

  .halfbr {
    height: 4px;
  }
  .br40px {
    height: 40px;
  }

  .row {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .bold {
    font-weight: bold;
  }
  .light {
    font-weight: 300;
  }
  .width-100 {
    width: 100%;
  }
  .ellipsize {
    width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
</style>
