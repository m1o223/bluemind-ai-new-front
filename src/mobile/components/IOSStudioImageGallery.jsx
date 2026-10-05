const IMAGE_EXAMPLES = [
  ["anime", "Anime", "Stylized Art"],
  ["portrait", "Portrait", "People"],
  ["mini-me", "Mini Me", "Personalized"],
  ["research", "Research", "Knowledge"],
  ["recipe", "Recipe", "Food"],
  ["cyberpunk", "Cyberpunk", "Sci-Fi"],
  ["fantasy", "Fantasy", "Worldbuilding"],
  ["realistic-photo", "Realistic Photo", "Photography"],
  ["cartoon", "Cartoon", "Illustration"],
  ["logo", "Logo Design", "Branding"],
  ["architecture", "Architecture", "Spaces"],
  ["product-mockup", "Product Mockup", "Commerce"],
  ["nature", "Nature", "Landscape"],
  ["character-design", "Character Design", "Characters"],
  ["concept-art", "Concept Art", "Creative Direction"],
  ["action-figure", "Action Figure", "Collectibles"],
  ["pixel-art", "Pixel Art", "Game Art"],
  ["fashion", "Fashion", "Style"],
  ["interior-design", "Interior Design", "Home"],
  ["icons", "Icons", "UI Assets"],
  ["sticker-style", "Sticker Style", "Social"],
  ["food-photography", "Food", "Photography"],
  ["landscape", "Landscape", "Scenery"],
  ["poster-design", "Poster Design", "Graphic Design"],
  ["album-cover", "Album Cover", "Music"],
].map(([id, title, category]) => ({
  id,
  title,
  category,
  src: `/assets/create-images/${id}.webp`,
}));

export default function IOSStudioImageGallery() {
  return (
    <section className="mx-auto w-full max-w-[540px]" aria-label="Image style examples">
      <div className="columns-2 gap-2.5">
        {IMAGE_EXAMPLES.map((item) => (
          <figure
            key={item.id}
            className="relative mb-2.5 break-inside-avoid overflow-hidden rounded-[18px] bg-white/[0.045] [content-visibility:auto]"
          >
            <img
              src={item.src}
              alt={`${item.title} image example`}
              loading="lazy"
              decoding="async"
              draggable="false"
              className="block h-auto w-full"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-2.5 pt-8 text-left">
              <span className="block text-[13px] font-semibold leading-4 text-white">{item.title}</span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.08em] text-white/58">{item.category}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
