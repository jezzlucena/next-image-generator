import { Locale, routing } from "@/i18n/routing"
import { LANGUAGES } from "@/util/constants"
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation"

interface Props {
  onClose: () => void,
  onChoose: (language: Locale) => void, 
}

export default function LanguageModal({ onClose, onChoose }: Props) {
  const params = useParams<{ locale: string }>()

  const t = useTranslations('LanguageModal');

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0">
      <div
        className="absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-lg shadow-lg w-[90%] max-w-[400px]"
      >
        <div className="text-gray-700">
          <div className="flex text-2xl">
            <div className="mb-1 grow">Select your language</div>

            <div className="ml-2 cursor-pointer" onClick={onClose}>&times;</div>
          </div>
          <div className="mb-2 text-md">Seleccione su idioma | Selecione seu idioma</div>
        </div>
        <hr />
        <div className="mt-2 text-sm">
          {routing.locales.map((l, index) => {
            console.log(params.locale, l)
            return <div
            className={"flex items-center justify-between p-2 mt-2 bg-gray-100 rounded-lg cursor-pointer " + (params.locale === l ? 'bg-gray-300' : '')}
            onClick={() => onChoose(l as Locale)}
            key={index}
          >
            <div>{ LANGUAGES[l as Locale].long }</div>
            <div className="text-xs text-gray-500 ml-2">{ t('choose') }</div>
          </div>
          })}
          
        </div>
      </div>
    </div>
  )
}