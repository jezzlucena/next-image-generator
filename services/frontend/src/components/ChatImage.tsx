import { GeneratedImage } from "@/types/GeneratedImage"
import Image from "next/image"
import styles from "./ChatImage.module.scss"

interface Props {
  image?: GeneratedImage
}

export default function ChatImage({ image }: Props) {
  return (
    <div className="flex mb-3">
      <div className="relative mx-auto max-w-[80%]">
        <div
          className={styles.image + " relative rounded-md bg-blue-500 text-white mr-2 overflow-hidden"}
          style={{ backgroundColor: image?.color }}
        >
          {image?.caption && !image?.imageUrl &&
            <div className={styles.squareBox + " absolute top-0 left-0"} />
          }
          {image?.caption &&
            <Image
              src={image?.imageUrl || '/file.svg'}
              alt={image?.caption || 'Generated Image'}
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: '100%', height: 'auto' }}
            />
          }
          <pre className={styles.caption + " text-center text-sm p-2"}>
            {image?.caption}
          </pre>
          {!image?.caption && !image?.imageUrl && <div className="py-2 px-4">
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>}
        </div>
        {image && image.error && <div className="mx-2 text-xs absolute bottom-0 text-nowrap left-1/2 transform -translate-x-1/2">
          Error sending image request.
        </div>}
      </div>
    </div>
  )
}