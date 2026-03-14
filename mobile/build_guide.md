# Guia de Build: APK (Android) e iOS

Este guia explica como gerar os arquivos instaláveis do seu aplicativo usando o **EAS (Expo Application Services)**.

## 1. Pré-requisitos

1. **Conta no Expo**: Crie uma em [expo.dev](https://expo.dev).
2. **Node.js instalado**: Você já tem isso.
3. **Instalar o EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
4. **Fazer Login**:
   ```bash
   eas login
   ```

## 2. Configurando o Projeto

Dentro da pasta `mobile`, execute:

```bash
eas build:configure
```

Isso criará/atualizará o arquivo `eas.json`.

## 3. Gerando um APK (Android para Teste)

Para gerar um arquivo `.apk` que você pode instalar diretamente no seu celular Android:

1. Certifique-se de que o `eas.json` tenha um perfil `preview` com:
   ```json
   "preview": {
     "android": {
       "buildType": "apk"
     }
   }
   ```
2. Rode o comando:
   ```bash
   eas build -p android --profile preview
   ```
3. Ao final, o Expo fornecerá um link para baixar o APK ou um QR Code.

## 4. Gerando para iOS

O processo para iOS é mais restrito (exige conta Apple Developer de $99/ano para publicar ou testar em múltiplos aparelhos fora do Expo Go).

### Se você NÃO tem conta de desenvolvedor Apple:

Você deve usar o **Expo Go** para testar:

1. Rode `npx expo start` na pasta mobile.
2. Abra o app Expo Go no seu iPhone e escaneie o QR Code.

### Se você TEM conta de desenvolvedor Apple:

1. Rode o comando:
   ```bash
   eas build -p ios
   ```
2. O EAS vai te guiar para fazer login na Apple e gerar os certificados automaticamente.

---

## Dicas de Design Premium

- **Gradientes**: Sempre use `expo-linear-gradient` para fundos.
- **Glassmorphism**: Use `BlurView` de `expo-blur` em cima de fundos coloridos.
- **Feedback Visual**: Garanta que todos os botões tenham `activeOpacity={0.7}`.
