# Tap to Pay

Découvrez comment accepter les paiements sans contact sur un appareil iPhone ou Android compatible.

Vous cherchez une solution no-code&nbsp;? [Acceptez des Payments depuis l’application mobile Stripe Dashboard](https://docs.stripe.com/no-code/in-person.md).

# iPhone

> This is a iPhone for when platform is ios. View the full page at https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=ios.

Utilisez Tap to Pay sur iPhone pour accepter les paiements sans contact en personne avec un [iPhone compatible](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay.md?platform=ios#supported-devices).

Tap to Pay sur iPhone prend en charge les cartes sans contact Visa, Mastercard et American Express, ainsi que les portefeuilles mobiles équipés de la technologie NFC (Apple Pay, Google Pay et Samsung Pay). La saisie du code PIN est prise en charge. De plus, Discover est pris en charge aux États-Unis, Interac au Canada et eftpos en Australie. Stripe inclut Tap to Pay on iPhone dans le SDK Terminal iOS et le SDK Terminal React Native, et active les paiements directement dans votre application mobile iOS.

> Pour les plateformes, l’utilisation de Tap to Pay sur iPhone est soumise aux [Conditions d’utilisation de la plateforme d’acceptation Apple](https://stripe.com/legal/apple-acceptance-platform).

### Disponibilité

- AU
- CA
- CZ
- DE
- ES
- FR
- GB
- IE
- IT
- NL
- NZ
- PL
- PT
- SE
- US

> Tap&nbsp;to&nbsp;Pay sur iPhone n’est pas disponible à Porto Rico.

### Disponibilité en (version bêta publique)

- AT
- BE
- CH
- CY
- DK
- EE
- FI
- HR
- HU
- JP
- LI
- LT
- LU
- LV
- MT
- NO
- RO
- SG
- SI
- SK

## Démarrer

#### iOS

Tap to Pay sur iPhone introduit une option de découverte [SCPDiscoveryMethodTapToPay](https://stripe.dev/stripe-terminal-ios/docs/Enums/SCPDiscoveryMethod.html#/c:@E@SCPDiscoveryMethod@SCPDiscoveryMethodTapToPay) et une méthode [connectReader](https://stripe.dev/stripe-terminal-ios/docs/Classes/SCPTerminal.html#/c:objc\(cs\)SCPTerminal\(im\)connectReader:delegate:connectionConfig:completion:). Intégrez la dernière version du [SDK Terminal iOS](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=ios) afin de bénéficier des derniers correctifs et fonctionnalités. Vous pouvez consulter les mises à jour et correctifs spécifiques à chaque version dans le [journal des modifications du SDK](https://github.com/stripe/stripe-terminal-ios/blob/master/CHANGELOG.md).

Les exigences relatives aux appareils et à la version minimale du SDK peuvent changer en raison de la mise à jour des exigences de conformité ou de failles de sécurité. Pour vous assurer que votre solution répond aux exigences de Tap to Pay, veuillez vous abonner à [terminal-announce@lists.stripe.com](https://groups.google.com/a/lists.stripe.com/g/terminal-announce).

Pour activer Tap to Pay dans votre formulaire d’inscription iOS&nbsp;:

1. [Demander](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone?language=objc) un droit.
1. [Installer](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=iOS) le SDK iOS Terminal.
1. [Connectez-vous](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=ios&reader-type=tap-to-pay) au lecteur Tap to Pay.
1. [Collecter](https://docs.stripe.com/terminal/payments/collect-card-payment.md?terminal-sdk-platform=ios) le paiement avec le lecteur Tap to Pay.

### Fichier de droits et fichier de build

Pour utiliser Tap to Pay sur iPhone afin d’accepter des paiements dans votre application, vous devez d’abord [demander et configurer le droit de développement Tap to Pay sur iPhone auprès de votre compte développeur Apple](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone?language=objc). Une fois les tests internes terminés, vous devez demander un droit de distribution.

Après avoir ajouté le fichier de droits de développement à la cible de build de votre application, ajoutez les éléments suivants&nbsp;:

| Clé            | `com.apple.developer.proximity-reader.payment.acceptance` |
| -------------- | --------------------------------------------------------- |
| Type de valeur | `boolean`                                                 |
| Valeur         | `true` ou `1`                                             |

La mise en œuvre de Tap to Pay sur iPhone est un processus complexe qui nécessite de soumettre votre application à Apple pour approbation. Pour obtenir des instructions détaillées, vous pouvez télécharger notre guide&nbsp;: [Guide Tap to Pay (PDF)](https://docs.stripecdn.com/fd6123a72c0ea6d22019c125f9a35d855fe859b4e327faeb89a2934091830744.pdf)

#### React Native

Tap to Pay sur iPhone introduit une option de découverte [tapToPay](https://stripe.dev/stripe-terminal-react-native/api-reference/modules/Reader.IOS.html#DiscoveryMethod) et une méthode [connectReader](https://stripe.dev/stripe-terminal-react-native/api-reference/interfaces/StripeTerminalSdkType.html#connectreader-1). Intégrez la dernière version du [SDK Terminal React Native](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=react-native) afin de bénéficier des derniers correctifs et fonctionnalités. Vous pouvez consulter les mises à jour et correctifs spécifiques à chaque version dans le [journal des modifications du SDK](https://github.com/stripe/stripe-terminal-android/blob/master/CHANGELOG.md).

Les exigences relatives aux appareils et à la version minimale du SDK peuvent changer en raison de la mise à jour des exigences de conformité ou de failles de sécurité. Pour vous assurer que votre solution répond aux exigences de Tap to Pay, veuillez vous abonner à [terminal-announce@lists.stripe.com](https://groups.google.com/a/lists.stripe.com/g/terminal-announce).

Pour activer Tap to Pay dans votre application&nbsp;:

1. [Demander](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone?language=objc) un droit.
1. [Installer](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=react-native) le SDK iOS Terminal.
1. [Connectez-vous](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=react-native&reader-type=tap-to-pay) au lecteur Tap to Pay.
1. [Collecter](https://docs.stripe.com/terminal/payments/collect-card-payment.md?terminal-sdk-platform=react-native) le paiement avec le lecteur Tap to Pay.

### Fichier de droits et fichier de build

Pour utiliser Tap to Pay sur iPhone afin d’accepter des paiements dans votre application, vous devez d’abord [demander et configurer le droit de développement Tap to Pay sur iPhone auprès de votre compte développeur Apple](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone?language=objc). Une fois les tests internes terminés, vous devez demander un droit de distribution.

Après avoir ajouté le fichier de droits de développement à la cible de build de votre application, ajoutez les éléments suivants&nbsp;:

| Clé            | `com.apple.developer.proximity-reader.payment.acceptance` |
| -------------- | --------------------------------------------------------- |
| Type de valeur | `boolean`                                                 |
| Valeur         | `true` ou `1`                                             |

La mise en œuvre de Tap to Pay sur iPhone est un processus complexe qui nécessite de soumettre votre application à Apple pour approbation. Pour obtenir des instructions détaillées, vous pouvez télécharger notre guide&nbsp;: [Guide Tap to Pay (PDF)](https://docs.stripecdn.com/fd6123a72c0ea6d22019c125f9a35d855fe859b4e327faeb89a2934091830744.pdf)

## Appareils pris en charge

Tap to Pay nécessite un iPhone XS (ou une version ultérieure) exécutant une version iOS datant d’un an ou moins. La [documentation d’Apple Business Register](https://register-docs.apple.com/tap-to-pay-on-iphone/docs/sdk-and-api-guide#ios-versions-and-deprecation-management) répertorie les versions d’iOS prises en charge. Conseillez à vos utilisateurs d’installer la dernière version d’iOS pour de meilleures performances.

> Tap to Pay ne fonctionnera pas sur les versions bêta d’iOS.

## Limites de la vérification du titulaire de la carte et solution de repli

Certaines transactions par carte sans contact [au-delà d’un certain montant](https://support.stripe.com/questions/what-are-the-regional-contactless-limits-for-stripe-terminal-transactions) peuvent exiger des méthodes de vérification supplémentaire du titulaire de la carte, comme la saisie d’un code PIN. Tap to Pay sur iPhone prend en charge la saisie du code PIN avec les appareils fonctionnant sous iOS 16.4 ou une version ultérieure.

Les paiements par portefeuille NFC (Apple&nbsp;Pay, Google&nbsp;Pay et Samsung&nbsp;Pay) ne nécessitent généralement pas de code&nbsp;PIN. Toutefois, au Royaume-Uni, au Canada et en Finlande, les exigences régionales et les politiques des émetteurs de cartes peuvent avoir une incidence sur les paiements sans contact.

Au Royaume-Uni, l’authentification forte du client peut nécessiter l’insertion de certaines cartes dans un appareil, en fonction de l’émetteur. Dans ce cas, si la carte bancaire n’est pas insérée, le paiement est refusé avant l’apparition de l’écran de code&nbsp;PIN, avec le motif `offline_pin_required`.

Au Canada et en Finlande, de nombreuses cartes utilisent uniquement un code PIN hors ligne, ce qui signifie que la saisie du PIN nécessite un contact physique, comme l’insertion dans un appareil, ce qui n’est pas pris en charge par Tap to Pay.

Dans ce cas, nous vous recommandons de proposer au client d’essayer avec une autre carte ou d’encaisser son paiement d’une autre manière, par exemple, à l’aide d’un lecteur de carte Terminal ou en envoyant un [lien de paiement](https://docs.stripe.com/payment-links.md).

Lorsque vous collectez un paiement avec votre appareil mobile, tenez la carte devant le lecteur jusqu’à ce qu’il lise les informations de la puce. Vous devrez peut-être attendre quelques secondes après la vibration qui se produit lorsque la carte entre en contact. En cas de refus de paiement, utilisez une autre méthode, comme un lecteur de cartes Terminal. Il n’est possible d’activer qu’une connexion à un lecteur à la fois.

Pour tester la saisie du code PIN sur les marchés où le code PIN est accepté, utilisez des [cartes de test physiques](https://docs.stripe.com/terminal/references/testing.md#physical-test-cards) avec des montants se terminant par ,03. Sur les marchés où le code PIN n’est pas accepté, une transaction se terminant par ,03 renvoie un code d’erreur `online_or_offline_pin_required` après la présentation de la carte, au lieu de permettre à l’utilisateur de tester la saisie du code PIN.

## Bonnes pratiques pour vos actions de promotion et votre branding

Veuillez suivre les [recommandations pour les interfaces utilisateurs](https://developer.apple.com/design/human-interface-guidelines/technologies/tap-to-pay-on-iphone/) pour Tap to Pay sur iPhone afin de garantir une expérience utilisateur optimale et un processus de révision réussi auprès d’Apple.

Prenez en compte les éléments suivants&nbsp;:

- Connectez-vous au lecteur en arrière-plan au démarrage de l’application pour réduire les temps d’attente lors de l’encaissement d’un paiement.
- Utilisez la [reconnexion automatique](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=ios&reader-type=tap-to-pay#automatically-attempt-reconnection) pour vous reconnecter au lecteur lorsque l’application passe au premier plan afin de réduire les temps d’attente.
- Expliquez à vos marchands comment accepter les paiements sans contact sur un iPhone compatible, notamment la gestion des promotions intégrées au produit et des alertes par SMS ou par e-mail. Consultez les conseils marketing d’Apple pour les [développeurs](https://developer.apple.com/tap-to-pay/marketing-guidelines/). Avec iOS 18, vous pouvez utiliser l’[API ProximityReaderDiscovery](https://developer.apple.com/documentation/proximityreader/proximityreaderdiscovery) d’Apple pour former les marchands à Tap to Pay on iPhone à l’aide de quelques lignes de code. Apple veille à ce que le contenu soit à jour et localisé dans la région de votre marchand.
- Lancez et faites la promotion de vos campagnes marketing Tap to Pay sur iPhone à l’aide de nos modèles de message et de nos ressources de conception en suivant les [directives Apple](https://developer.apple.com/tap-to-pay/marketing-guidelines/#editorial-guidelines). Devenez un partenaire Stripe [ici](https://stripe.com/partners/become-a-partner) pour accéder à ces ressources sur le [portail des partenaires](https://portal.stripe.partners/s).


# Android

> This is a Android for when platform is android. View the full page at https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay?platform=android.

Utilisez Tap to Pay sur Android pour accepter des paiements sans contact en personne avec des [appareils Android compatibles NFC](https://docs.stripe.com/terminal/payments/setup-reader/tap-to-pay.md?platform=android#supported-devices).

Tap to Pay sur Android prend en charge les cartes sans contact Visa, Mastercard, American Express et Discover, ainsi que les portefeuilles mobiles basés sur la technologie NFC (Apple Pay, Google Pay et Samsung Pay). La saisie du code PIN est prise en charge. En outre, eftpos est pris en charge en Australie et Interac est disponible en version bêta au Canada. Stripe inclut Tap to Pay sur Android dans le SDK Terminal Android et le SDK Terminal React Native, et permet les paiements directement dans votre application mobile Android.

### Disponibilité

- AT
- AU
- BE
- CH
- DE
- DK
- FI
- FR
- GB
- IE
- IT
- MY
- NL
- NZ
- PL
- SE
- SG
- US

### Disponibilité en (version bêta publique)

- CA
- CY
- CZ
- EE
- ES
- GI
- HR
- HU
- LI
- LT
- LU
- LV
- MT
- NO
- PT
- RO
- SI
- SK

## Démarrer

#### Android

Intégrez la dernière version du [SDK Terminal Android](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=android) pour inclure les dernières corrections de bogues et fonctionnalités. Vous pouvez afficher les mises à jour spécifiques à la version et les corrections de bogues dans le [changelog du SDK](https://github.com/stripe/stripe-terminal-android/blob/master/CHANGELOG.md).

Les exigences relatives aux appareils et à la version minimale du SDK peuvent changer en raison de la mise à jour des exigences de conformité ou de failles de sécurité. Pour vous assurer que votre solution répond aux exigences de Tap to Pay, veuillez vous abonner à [terminal-announce@lists.stripe.com](https://groups.google.com/a/lists.stripe.com/g/terminal-announce).

Pour activer Tap to Pay sur votre application Android&nbsp;:

1. [Configurez](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=android) le SDK Android Terminal.
1. Remplacez vos dépendances `stripeterminal` existantes par les dépendances suivantes&nbsp;:
   #### Kotlin

   ```kotlin
       dependencies {
     implementation("com.stripe:stripeterminal-taptopay:5.0.0")
     implementation("com.stripe:stripeterminal-core:5.0.0")
     // ...
   }
   ```

   #### Groovy

   ```groovy
   dependencies {
     implementation "com.stripe:stripeterminal-taptopay:5.0.0"
     implementation "com.stripe:stripeterminal-core:5.0.0"
     // ...
   }
   ```
1. [Connectez-vous](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=android&reader-type=tap-to-pay) au lecteur Tap to Pay.
1. [Collecter](https://docs.stripe.com/terminal/payments/collect-card-payment.md?terminal-sdk-platform=android) le paiement avec le lecteur Tap to Pay.

#### React Native

Intégrez la dernière version du [SDK Terminal React Native](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=react-native) pour inclure les derniers correctifs et les dernières fonctionnalités.

Les exigences relatives aux appareils et à la version minimale du SDK peuvent changer en raison de la mise à jour des exigences de conformité ou des failles de sécurité. Pour vous assurer que votre solution est à jour avec les exigences Tap to Pay, abonnez-vous à [terminal-announce@lists.stripe.com](https://groups.google.com/a/lists.stripe.com/g/terminal-announce). Pour activer Tap to Pay dans votre application&nbsp;:

1. [Configurez](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=react-native) le SDK Terminal React Native.
1. [Connectez-vous](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=react-native&reader-type=tap-to-pay) au lecteur Tap to Pay.
1. [Collecter](https://docs.stripe.com/terminal/payments/collect-card-payment.md?terminal-sdk-platform=react-native) le paiement avec le lecteur Tap to Pay.

## Appareils pris en charge

Tap to Pay sur Android fonctionne avec une variété d’appareils Android tels que les téléphones mobiles, les kiosques, les tablettes, les appareils portatifs, etc. Vous pouvez uniquement découvrir et vous connecter aux appareils qui répondent à tous les critères suivants&nbsp;:

- Dispose d’un capteur NFC intégré fonctionnel et d’un processeur ARM
- N’est pas rooté et le bootloader de l’appareil est verrouillé et n’a pas été modifié
- Fonctionne sous Android&nbsp;13 ou version ultérieure
- Utilise les services Google Mobile et dispose de l’application Google Play Store
- Dispose d’un keystore avec prise en charge matérielle pour ECDH ([`FEATURE_HARDWARE_KEYSTORE`](https://developer.android.com/reference/android/content/pm/PackageManager#FEATURE_HARDWARE_KEYSTORE) version doit être&nbsp;100 ou ultérieure)
- Une connexion Internet stable
- Exécute le système d’exploitation non modifié fourni par le fabricant

> Tap to Pay ne fonctionnera pas sur les versions bêta d’Android.

Les émulateurs Android ne sont pas pris en charge par Tap&nbsp;to&nbsp;Pay. Le lecteur de simulation et le lecteur réel appliquent les mêmes exigences concernant les appareils, afin d’offrir aux développeurs l’expérience la plus réaliste possible pendant les tests.

### Types d’appareils

Les types d’appareils pris en charge incluent, sans s’y limiter&nbsp;:

| Type d’appareil                                                                   | Fabricant                                                                         | Modèles                                   |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| Comptoir                                                                          | [Sunmi](https://partner.posportal.com/stripe/stripe/catalog/category/view/id/11/) | D3 MINI, V3 MIX                           |
| Portatif                                                                          | Amobile                                                                           | PD602                                     |
| Honeywell                                                                         | CT37, CT47                                                                        |
| Chainway                                                                          | C66                                                                               |
| Ciontek                                                                           | CS50C                                                                             |
| iMin                                                                              | Swift 2 Pro                                                                       |
| [Sunmi](https://partner.posportal.com/stripe/stripe/catalog/category/view/id/11/) | L3, V3                                                                            |
| ZCS                                                                               | Z92                                                                               |
| Zebra                                                                             | TC53, TC53E                                                                       |
| Kiosque                                                                           | [Sunmi](https://partner.posportal.com/stripe/stripe/catalog/category/view/id/11/) | FLEX 3, K2                                |
| S’inscrire                                                                        | iMin                                                                              | Falcon2                                   |
| [Sunmi](https://partner.posportal.com/stripe/stripe/catalog/category/view/id/11/) | D3 PRO, T3 PRO                                                                    |
| Tablette                                                                          | Samsung Galaxy Tab                                                                | Active Pro, Active3, Active4 Pro, Active5 |
| HMD Global                                                                        | HMD T21                                                                           |
| Hosoton                                                                           | H101                                                                              |
| Oukitel                                                                           | RT3                                                                               |
| Ulefone                                                                           | Armor Pad Pro                                                                     |

Certains fabricants produisent à la fois des appareils certifiés GMS et non certifiés GMS. Si vous utilisez un appareil non certifié GMS, vous recevrez un message d’erreur indiquant «&nbsp;ATTESTATION_FAILURE&nbsp;: l’appareil n’est pas certifié Google Mobile Services (GMS)&nbsp;» lorsque vous tenterez de connecter l’appareil. Si cela se produit, contactez le fabricant pour résoudre le problème.

### Téléphones portables

Les téléphones mobiles pris en charge incluent, sans s’y limiter&nbsp;:

| Fabricant      | Modèles                                                                                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asus           | Zenphone 9                                                                                                                                                                                                                                                |
| Google         | Pixel 6, Pixel 6a, Pixel 7, Pixel 7a, Pixel 8, Pixel 8a, Pixel 9, Pixel 9a, Pixel 10                                                                                                                                                                      |
| Nokia          | G22, G310, G42, G60, X10, X20, X30                                                                                                                                                                                                                        |
| Honor          | 70, 70 Lite, 90, 90 Lite, 90 Smart, Magic5, Magic6, Magic7, X6, X7, X8, X9                                                                                                                                                                                |
| Infinix        | Hot 40 Pro, HOT 60i                                                                                                                                                                                                                                       |
| LG             | V60 ThinQ                                                                                                                                                                                                                                                 |
| Motorola       | Moto GX4, Moto GX5, G 2023, Edge 2023, G 2024, Edge 2024, G 2025, Edge 2025                                                                                                                                                                               |
| OnePlus        | Nord 4, Nord CE3, Nord CE4, Nord N30, 12, 12R, 13, 13R                                                                                                                                                                                                    |
| Oppo           | A60, A74, A77, A78, A79, A98, A98, FindX2 Pro, Find X2 Lite, Find X3 Pro, Find X5 Pro, Reno8, Reno10, Reno11, Reno12, Reno13, Reno14                                                                                                                      |
| Samsung Galaxy | A04s, A05s, A13, A14, A15, A16, A17, A22, A23, A24, A25, A26, A32, A33, A34, A35, A36, A42, A42s, A53, A54, A55, A56, A71, A72, A73, Note20, S22, S23, S24, S25, Z Flip3, Z Fold3, Z Flip4, Z Fold4, Z Flip5, Z Fold5, Z Flip6, Z Fold6, Z Flip7, Z Fold7 |
| Xiaomi         | 12, 12S, 12T, 13, 13T, 14, 14T, 15, 15T, Redmi 10, Redmi 12, Redmi 12C, Redmi 13, Redmi 13C, Redmi 14C, Redmi 15, Redmi Note 10, Redmi Note 11, Redmi Note 12, Redmi Note 13, Redmi Note 14                                                               |

## Interface utilisateur

Tap to Pay sur Android inclut des écrans pour le recouvrement des paiements. Une fois que votre application est prête à collecter un paiement, le SDK Stripe Terminal prend le relais pour gérer le processus de recouvrement. Après avoir appelé la méthode de [traitement du paiement](https://docs.stripe.com/terminal/payments/collect-card-payment.md#process-payment), votre application continue de fonctionner tandis que Tap to Pay affiche un message en plein écran invitant le titulaire de la carte à taper sa carte ou son portefeuille mobile NFC. Si une erreur survient lors de la lecture de la carte, un message invitant à réessayer s’affiche. Une fois la carte validée, une indication de réussite s’affiche et le contrôle revient à votre application.

### Zone de prise NFC spécifique à l’appareil

Le SDK Tap to Pay sur Android déplace automatiquement l’indicateur de zone de paiement afin d’aider l’utilisateur final à comprendre où se trouve la zone de paiement sur l’appareil. Découvrez des exemples illustrant à quoi pourrait ressembler l’expérience utilisateur dans la pratique&nbsp;:
![Exemple d’écran tactile générique](https://b.stripecdn.com/docs-statics-srv/assets/ttp-android-default.6da0eaaef1aa15fe8986a2a633e11fdb.gif)

Écran tactile générique
![Exemple d’écran tactile spécifique à un appareil](https://b.stripecdn.com/docs-statics-srv/assets/ttp-android-device-specific.625dc1a08f5576c6b1d7588a8599f74b.gif)

Écran tactile spécifique à l’appareil

### Configuration de l’expérience utilisateur

#### Android

- [TapToPayUxConfiguration (Android)](https://stripe.dev/stripe-terminal-android/external/com.stripe.stripeterminal.external.models/-tap-to-pay-ux-configuration/index.html)

Vous pouvez remplacer l’écran tactile par défaut à l’aide du SDK Android Terminal, y compris les couleurs de la zone tactile, le message d’erreur, l’animation de réussite et la position de l’indicateur de zone tactile. Appelez cette méthode pendant votre processus d’initialisation ou de connexion du lecteur. Vous pouvez invoquer cette fonction plusieurs fois si vous devez ajuster l’apparence de l’écran tactile pendant la durée de vie de votre application. Cette méthode n’affecte que l’apparence de l’écran tactile, elle n’a aucun impact sur l’écran de saisie du code PIN ou l’invite de paiement simulée.

#### Kotlin

```kotlin
val config = TapToPayUxConfiguration.Builder()
    .tapZone(
        TapToPayUxConfiguration.TapZone.Front(0.5f, 0.3f)
    )
    .colors(
        TapToPayUxConfiguration.ColorScheme.Builder()
            .primary(TapToPayUxConfiguration.Color.Value(Color.parseColor("#FF008686")))
            .success(TapToPayUxConfiguration.Color.Default)
            .error(TapToPayUxConfiguration.Color.Resource(android.R.color.holo_red_dark))
            .build()
    )
    .darkMode(
        TapToPayUxConfiguration.DarkMode.DARK
    )
    .build()

Terminal.getInstance().setTapToPayUxConfiguration(config)
```

#### Java

```java
TapToPayUxConfiguration config = new TapToPayUxConfiguration.Builder()
    .tapZone(
        new TapToPayUxConfiguration.TapZone.Front(0.5f, 0.3f)
    )
    .colors(
        new TapToPayUxConfiguration.ColorScheme.Builder()
        .primary(new TapToPayUxConfiguration.Color.Value(Color.parseColor("#FF008686")))
        .success(TapToPayUxConfiguration.Color.Default.INSTANCE)
        .error(new TapToPayUxConfiguration.Color.Resource(android.R.color.holo_red_dark))
        .build()
    )
    .darkMode(
        TapToPayUxConfiguration.DarkMode.DARK
    )
    .build();

Terminal.getInstance().setTapToPayUxConfiguration(config);
```

#### React Native

- [TapToPayUxConfiguration (React Native)](https://stripe.dev/stripe-terminal-react-native/api-reference/types/TapToPayUxConfiguration.html)

Vous pouvez remplacer l’écran tactile par défaut à l’aide du SDK Terminal React Native, y compris les couleurs de la zone tactile, le message d’erreur, l’animation de réussite et la position de l’indicateur de zone tactile. Appelez cette méthode pendant votre processus d’initialisation ou de connexion du lecteur. Vous pouvez invoquer cette fonction plusieurs fois si vous devez ajuster l’apparence de l’écran tactile pendant la durée de vie de votre application. Cette méthode n’affecte que l’apparence de l’écran tactile, elle n’a aucun impact sur l’écran de saisie du code PIN ou l’invite de paiement simulée.

```js
import {
  useStripeTerminal,
  TapZoneIndicator,
  DarkMode,
} from '@stripe/stripe-terminal-react-native';

const { setTapToPayUxConfiguration } = useStripeTerminal();

const callSetTapToPayUxConfiguration = async () => {
  let tapZoneIndicator = TapZoneIndicator.FRONT;
  let tapZonePosition = {
    xBias: 0.5,
    yBias: 0.3,
  };
  let tapZone = {
    tapZoneIndicator: tapZoneIndicator,
    tapZonePosition: tapZonePosition,
  };
  let darkMode = DarkMode.DARK;
  let colors = {
    primary: '#FF008686',
    error: '#FFCC0000',
  };
  let config = {
    tapZone: tapZone,
    darkMode: darkMode,
    colors: colors,
  };

  const { error } = await setTapToPayUxConfiguration(config);

  if (error) {
    console.log('setTapToPayUxConfiguration error', error);
    return;
  }

  console.log('setTapToPayUxConfiguration success');
};
```

## Limites de la vérification du titulaire de la carte et solution de repli

Certaines transactions par carte sans contact [au-delà d’un certain montant](https://support.stripe.com/questions/what-are-the-regional-contactless-limits-for-stripe-terminal-transactions) peuvent nécessiter des méthodes de vérification supplémentaires du titulaire de la carte (CVM), comme la saisie d’un code PIN. Tap to Pay sur Android prend en charge la saisie du code PIN sur le SDK Terminal Android [4.3.0](https://github.com/stripe/stripe-terminal-android/releases/tag/v4.3.0), ou une version supérieure.

Le code&nbsp;PIN est collecté dans deux scénarios&nbsp;:

1. Le montant de la transaction est supérieur à la [limite associée à la méthode de vérification du titulaire de carte](https://support.stripe.com/questions/what-are-the-regional-contactless-limits-for-stripe-terminal-transactions).

Dans ce cas, le code&nbsp;PIN est collecté avant le renvoi de [collectPaymentMethod](https://stripe.dev/stripe-terminal-android/core/com.stripe.stripeterminal/-terminal/collect-payment-method.html). Le flux revient à votre application après la saisie du code&nbsp;PIN ou l’annulation de cette collecte.
![Flux de code PIN local avec Tap to Pay sur Android](https://b.stripecdn.com/docs-statics-srv/assets/ttpa_local_pin_flow.61727b001c3ae7bbf242346df477c94d.png)

1. L’émetteur fait une demande d’[authentification forte du client (SCA)](https://stripe.com/guides/strong-customer-authentication).

Dans ce cas, le code&nbsp;PIN est collecté pendant [confirmPaymentIntent](https://stripe.dev/stripe-terminal-android/core/com.stripe.stripeterminal/-terminal/confirm-payment-intent.html). Le flux revient à votre application après confirmPaymentIntent, sauf si l’émetteur demande un code&nbsp;PIN. Dans ce cas, la collecte du code&nbsp;PIN revient au premier plan jusqu’à ce que le code&nbsp;PIN soit saisi ou que sa collecte soit annulée.
![Flux de code PIN et SCA avec Tap to Pay sur Android](https://b.stripecdn.com/docs-statics-srv/assets/ttpa_sca_pin_flow.01233cc8e22c1249bbd34a8180b22030.png)

### Gestion des erreurs de code PIN

Vous ne pouvez collecter un code&nbsp;PIN que dans les conditions suivantes&nbsp;:

- Les [options pour les développeurs](https://developer.android.com/studio/debug/dev-options) sont désactivées.
- Il n’y a pas de [services d’accessibilité](https://developer.android.com/guide/topics/ui/accessibility/service) inscrits ou en cours d’exécution.
- Il n’y a pas d’[enregistrement d’écran](https://support.google.com/android/answer/9075928) en cours.
- Il n’y a pas de [fenêtres de superposition à l’écran](https://developer.android.com/privacy-and-security/risks/tapjacking)
- Vous disposez d’une connexion internet active.

La collecte du code PIN échoue également si une partie tente de faire une capture d’écran.

Si la collecte du code PIN échoue en raison de l’un de ces facteurs, vous recevez un message d’erreur `TAP_TO_PAY_INSECURE_ENVIRONMENT` contenant des informations supplémentaires sur la cause de l’erreur. Nous vous recommandons de fournir des indications concrètes aux utilisateurs afin qu’ils puissent relancer le paiement et saisir le code PIN.

### Spécificités régionales concernant les codes PIN

Les paiements par portefeuille NFC (Apple&nbsp;Pay, Google&nbsp;Pay et Samsung&nbsp;Pay) ne nécessitent généralement pas de code&nbsp;PIN. Toutefois, au Royaume-Uni, au Canada et en Finlande, les exigences régionales et les politiques des émetteurs de cartes peuvent avoir une incidence sur les paiements sans contact.

Au Royaume-Uni, l’authentification forte du client peut nécessiter l’insertion de certaines cartes dans un appareil, en fonction de l’émetteur. Dans ce cas, si la carte bancaire n’est pas insérée, le paiement est refusé avant l’apparition de l’écran de code&nbsp;PIN, avec le motif `offline_pin_required`.

Au Canada et en Finlande, de nombreuses cartes utilisent uniquement un code PIN hors ligne, ce qui signifie que la saisie du PIN nécessite un contact physique, comme l’insertion dans un appareil, ce qui n’est pas pris en charge par Tap to Pay.

Dans ce cas, nous vous recommandons de proposer au client d’essayer avec une autre carte ou d’encaisser son paiement d’une autre manière, par exemple, à l’aide d’un lecteur de carte Terminal ou en envoyant un [lien de paiement](https://docs.stripe.com/payment-links.md).

Lorsque vous collectez un paiement avec votre appareil mobile, tenez la carte devant le lecteur jusqu’à ce qu’il lise les informations de la puce. Vous devrez peut-être attendre quelques secondes après la vibration qui se produit lorsque la carte entre en contact. En cas de refus de paiement, utilisez une autre méthode, comme un lecteur de cartes Terminal. Il n’est possible d’activer qu’une connexion à un lecteur à la fois.

### Expérience utilisateur - PIN

Pour des raisons de sécurité, le clavier PIN n’apparaît pas toujours au centre de l’écran. Il apparaît à un emplacement déterminé de manière aléatoire.
![Écran de collecte du code PIN avec Tap to Pay sur Android](https://b.stripecdn.com/docs-statics-srv/assets/ttpa_pin_screen.3404e73a3567a63bfdea0a456871c65e.png)

Un clavier PIN décentré est un comportement normal

## Bonnes pratiques pour vos actions de promotion et votre branding

Pour offrir une expérience utilisateur optimale, tenez compte des points suivants :

- Connectez-vous au lecteur en arrière-plan au démarrage de l’application pour réduire les temps d’attente lors de l’encaissement d’un paiement.
- Utilisez la [reconnexion automatique](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=android&reader-type=tap-to-pay#automatically-attempt-reconnection) pour vous reconnecter au lecteur lorsque l’application passe au premier plan afin de réduire les temps d’attente.
- Expliquez à vos marchands comment accepter les paiements sans contact sur un appareil Android compatible, notamment concernant la gestion des promotions intégrées au produit et des alertes par SMS ou par e-mail.
- Lancez et faites la promotion de vos campagnes marketing Tap to Pay sur Android à l’aide de nos modèles de message et de nos ressources de conception. Devenez un partenaire Stripe [ici](https://stripe.com/partners/become-a-partner) pour accéder à ces ressources sur le [portail des partenaires](https://portal.stripe.partners/s/login/?language=en_US&ec=302&startURL=%2Fs%2F).


## Prochaines étapes

- [Configuration de l’intégration](https://docs.stripe.com/terminal/payments/setup-integration.md)






# Configurer votre intégration

Configurez un SDK Stripe Terminal ou une intégration pilotée par serveur pour accepter les paiements par TPE.

# Intégration pilotée par serveur

> This is a Intégration pilotée par serveur for when terminal-sdk-platform is server-driven. View the full page at https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=server-driven.

Les intégrations pilotées par serveur utilisent l’API Stripe au lieu d’un SDK Terminal pour se connecter aux [lecteurs intelligents WisePOS E ou Stripe S700](https://docs.stripe.com/terminal/smart-readers.md) et encaisser les paiements par TPE. Cela vous permet de&nbsp;:

- Utiliser Terminal, même si votre infrastructure n’est pas prise en charge par les SDK iOS, Android ou JavaScript
- Développer une intégration Terminal propulsée par votre middleware personnalisé ou votre infrastructure basée sur le cloud
- Intégrer n’importe quel appareil, y compris un point de vente basé sur .NET, à Terminal
- Améliorer les connexions au réseau du lecteur en utilisant une connexion internet plutôt qu’une connexion à un réseau local
- Utiliser des requêtes curl pour simuler une intégration

L’intégration pilotée par le serveur ne prend pas en charge&nbsp;:

- [Lecteurs mobiles Stripe Terminal](https://docs.stripe.com/terminal/mobile-readers.md)
- [Encaissement des paiements par carte hors ligne](https://docs.stripe.com/terminal/features/operate-offline/collect-card-payments.md)

## Démarrer

Vous pouvez démarrer votre intégration pilotée par serveur à l’aide du [guide de démarrage rapide Terminal](https://docs.stripe.com/terminal/quickstart.md) avec les composants suivants&nbsp;:

- **Votre application de point de vente**&nbsp;: interface utilisateur que les employés voient lors de la création d’une transaction.
- **Votre infrastructure de back-end**&nbsp;: traite les requêtes de votre application de point de vente et envoie des requêtes à l’API Stripe lors de la transaction.
- **L’API Stripe**&nbsp;: reçoit les requêtes et les transmet à un lecteur intelligent, tel que le [lecteur BBPOS WisePOS E](https://docs.stripe.com/terminal/payments/setup-reader/bbpos-wisepos-e.md) ou le [lecteur S700 de Stripe](https://docs.stripe.com/terminal/readers/stripe-reader-s700.md). Stripe envoie également à votre infrastructure de back-end des *webhooks* (A webhook is a real-time push notification sent to your application as a JSON payload through HTTPS requests) indiquant l’état du paiement.
- **Un lecteur BBPOS WisePOS E, un lecteur S700 de Stripe ou un lecteur de simulation**&nbsp;: invite le titulaire à régler son achat et communique avec Stripe et son infrastructure financière pour traiter le paiement. Vous pouvez créer un lecteur de simulation si vous ne disposez pas encore d’un lecteur physique.
![Architecture d'intégration pilotée par serveur](https://b.stripecdn.com/docs-statics-srv/assets/server-driven-integration-architecture.a8499c1169a540cef98c9dd539f99a61.png)

## See also

- [Guide de démarrage rapide de Terminal](https://docs.stripe.com/terminal/quickstart.md)
- [Se connecter à un lecteur](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=server-driven&reader-type=internet)


# JavaScript

> This is a JavaScript for when terminal-sdk-platform is js. View the full page at https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=js.

> Pour les lecteurs intelligents, tels que le lecteur [BBPOS WisePOS&nbsp;E](https://docs.stripe.com/terminal/payments/setup-reader/bbpos-wisepos-e.md) ou [Stripe Reader&nbsp;S700](https://docs.stripe.com/terminal/readers/stripe-reader-s700.md), nous vous recommandons d’utiliser l’[intégration pilotée par serveur](https://docs.stripe.com/terminal/payments/setup-integration.md?terminal-sdk-platform=server-driven) plutôt que le SDK JavaScript. L’intégration pilotée par serveur utilise l’API Stripe au lieu de s’appuyer sur les communications réseau locales pour collecter les paiements. Consultez notre [comparatif des plateformes](https://docs.stripe.com/terminal/payments/setup-reader.md#sdk) pour choisir la plateforme la mieux adaptée à vos besoins.

Si vous recherchez un document qui décrit plus en détail les méthodes, objets et erreurs disponibles, consultez notre [documentation complète sur les SDK](https://docs.stripe.com/terminal/references/api/js-sdk.md).

### Configuration requise pour le SDK Terminal JavaScript

Lorsque vous intégrez des [lecteurs intelligents](https://docs.stripe.com/terminal/smart-readers.md) à l’aide du SDK JavaScript, assurez-vous que votre réseau répond à [nos exigences](https://docs.stripe.com/terminal/network-requirements.md).

Pour démarrer avec le SDK JavaScript, suivez ces trois étapes&nbsp;:

1. [Installer le SDK et la bibliothèque client](https://docs.stripe.com/terminal/payments/setup-integration.md#install) sur votre page de paiement
1. [Configurer l’endpoint du token de connexion](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token) sur votre application web et votre back-end.
1. [Initialiser le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#initialize) sur votre application web

> Si vous intégrez votre application web à l’aide du SDK JavaScript, vous pouvez l’exécuter sur le navigateur d’un appareil mobile dès lors que cet appareil est connecté au même réseau local que le lecteur et que les appareils de ce réseau peuvent communiquer directement les uns avec les autres.

## Installer le SDK et la bibliothèque client [Côté client] [Côté serveur]

#### Côté client

Pour commencer, intégrez ce script à votre page de paiement. Ce script doit toujours être chargé directement à partir du site **https://js.stripe.com** pour des raisons de compatibilité avec les derniers logiciels du lecteur. Vous ne devez pas inclure le script dans un lot ni en héberger une copie&nbsp;; si vous le faites, votre intégration pourrait être interrompue sans avertissement.

```html
<script src="https://js.stripe.com/terminal/v1/"></script>
```

#### Utiliser le SDK JS Terminal comme un module

Nous proposons également un paquet npm pour charger et utiliser SDK JS Terminal en tant que module. Pour en savoir plus, consultez le [projet sur GitHub](https://github.com/stripe/terminal-js).

> Pour en savoir plus sur la migration depuis une version bêta antérieure du SDK JavaScript, consultez le [Guide de migration vers Stripe Terminal Bêta](https://docs.stripe.com/terminal/references/sdk-migration-guide.md).

#### Côté serveur

Utilisez nos bibliothèques officielles pour accéder à l’API Stripe à partir de votre application&nbsp;:

#### Ruby

```bash
# Available as a gem
sudo gem install stripe
```

```ruby
# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

#### Python

```bash
# Install through pip
pip3 install --upgrade stripe
```

```bash
# Or find the Stripe package on http://pypi.python.org/pypi/stripe/
```

```python
# Find the version you want to pin:
# https://github.com/stripe/stripe-python/blob/master/CHANGELOG.md
# Specify that version in your requirements.txt file
stripe>=5.0.0
```

#### PHP

```bash
# Install the PHP library with Composer
composer require stripe/stripe-php
```

```bash
# Or download the source directly: https://github.com/stripe/stripe-php/releases
```

#### Java

```java
/*
  For Gradle, add the following dependency to your build.gradle and replace with
  the version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
*/
implementation "com.stripe:stripe-java:30.0.0"
```

```xml
<!--
  For Maven, add the following dependency to your POM and replace with the
  version number you want to use from:
  - https://mvnrepository.com/artifact/com.stripe/stripe-java or
  - https://github.com/stripe/stripe-java/releases/latest
-->
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>30.0.0</version>
</dependency>
```

```bash
# For other environments, manually install the following JARs:
# - The Stripe JAR from https://github.com/stripe/stripe-java/releases/latest
# - Google Gson from https://github.com/google/gson
```

#### Node.js

```bash
# Install with npm
npm install stripe --save
```

#### Go

```bash
# Make sure your project is using Go Modules
go mod init
# Install stripe-go
go get -u github.com/stripe/stripe-go/v83
```

```go
// Then import the package
import (
  "github.com/stripe/stripe-go/v83"
)
```

#### .NET

```bash
# Install with dotnet
dotnet add package Stripe.net
dotnet restore
```

```bash
# Or install with NuGet
Install-Package Stripe.net
```

## Configurer l'endpoint ConnectionToken [Côté serveur] [Côté client]

#### Côté serveur

Pour se connecter à un lecteur, votre back-end doit donner au SDK la permission d’utiliser le lecteur avec votre compte Stripe en lui fournissant la [clé secrète](https://docs.stripe.com/api/terminal/connection_tokens/object.md#terminal_connection_token_object-secret) d’un [ConnectionToken](https://docs.stripe.com/api/terminal/connection_tokens.md). Votre back-end doit créer des tokens de connexion uniquement pour les clients qu’il reconnaît comme fiables.

#### curl

```bash
curl https://api.stripe.com/v1/terminal/connection_tokens \
  -u <<YOUR_SECRET_KEY>>: \
  -X "POST"
```

#### Ruby

```ruby

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = Stripe::Terminal::ConnectionToken.create
```

#### Python

```python

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = stripe.terminal.ConnectionToken.create()
```

#### PHP

```php

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
$connectionToken = \Stripe\Terminal\ConnectionToken::create();
```

#### Java

```java

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
ConnectionTokenCreateParams params =
  ConnectionTokenCreateParams.builder()
    .build();

ConnectionToken connectionToken = ConnectionToken.create(params);
```

#### Node.js

```javascript

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
let connectionToken = stripe.terminal.connectionTokens.create();
```

#### Go

```go

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<YOUR_SECRET_KEY>>"

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
params := &stripe.TerminalConnectionTokenParams{}
ct, _ := connectiontoken.New(params)
```

#### .NET

```csharp

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
var options = new ConnectionTokenCreateOptions{};
var service = new ConnectionTokenService();
var connectionToken = service.Create(options);
```

Obtenez la clé secrète à partir du `ConnectionToken` sur votre serveur et transmettez-la côté client.

#### Ruby

```ruby
post '/connection_token' do
  token = # ... Create or retrieve the ConnectionToken
  {secret: token.secret}.to_json
end
```

#### Python

```python
from flask import jsonify

@app.route('/connection_token', methods=['POST'])
def token():
  token = # ... Create or retrieve the ConnectionToken
  return jsonify(secret=token.secret)
```

#### PHP

```php
<?php
    $token = # ... Create or retrieve the ConnectionToken
    echo json_encode(array('secret' => $token->secret));
?>
```

#### Java

```java
import java.util.HashMap;
import java.util.Map;

import com.stripe.model.ConnectionToken;

import com.google.gson.Gson;
import static spark.Spark.post;

public class StripeJavaQuickStart {
    public static void main(String[] args) {
      Gson gson = new Gson();

      post("/connection_token", (request, response) -> {
        ConnectionToken token = // ... Fetch or create the ConnectionToken

        Map<String, String> map = new HashMap();
        map.put("secret", token.getSecret());

        return map;
      }, gson::toJson);
    }
}
```

#### Node.js

```javascript
const express = require('express');
const app = express();

app.post('/connection_token', async (req, res) => {
  const token = // ... Fetch or create the ConnectionToken
  res.json({secret: token.secret});
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
```

#### Go

```go
package main

import (
  "encoding/json"
  "net/http"
)

type TokenData struct {
  Secret string `json:"secret"`
}

func main() {
  http.HandleFunc("/connection_token", func(w http.ResponseWriter, r *http.Request) {
    token := // ... Fetch or create the ConnectionToken
    data := TokenData{
      Secret: token.secret,
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(data)
  })

  http.ListenAndServe(":3000", nil)
}
```

#### .NET

```csharp
using System;
using Microsoft.AspNetCore.Mvc;

namespace StripeExampleApi.Controllers
{
    [Route("connection_token")]
    [ApiController]
    public class StripeApiController : Controller
    {
        [HttpPost]
        public ActionResult Post()
        {
            var token = // ... Fetch or create the ConnectionToken
            return Json(new {secret = token.Secret});
        }
    }
}
```

> Le `secret` du `ConnectionToken` vous permet de vous connecter à n’importe quel lecteur Stripe Terminal et de traiter les paiements à l’aide de votre compte Stripe. Veillez à authentifier l’endpoint pour créer des tokens de connexion et à le protéger contre la falsification des requêtes intersites (CSRF).

#### Côté client

Pour permettre au SDK d’accéder à cet endpoint, créez une fonction dans votre application web qui demande un `ConnectionToken` à votre back-end et renvoie le `secret` de l’objet `ConnectionToken`.

```javascript
async function fetchConnectionToken() {
  // Your backend should call /v1/terminal/connection_tokens and return the JSON response from Stripe
  const response = await fetch('https://{{YOUR_BACKEND_URL}}/connection_token', { method: "POST" });
  const data = await response.json();
  return data.secret;
}
```

Cette fonction est appelée dès lors que le SDK doit s’authentifier auprès de Stripe ou du lecteur. Elle est également appelée lorsqu’un nouveau token est nécessaire pour se connecter à un lecteur (par exemple, lorsque votre application s’est déconnectée du lecteur). Si le SDK n’est pas en mesure de récupérer un nouveau jeton de connexion depuis votre backend, la connexion au lecteur échoue associée à une erreur de votre serveur.

> Ne mettez pas en cache et ne codez pas en dur le token de connexion. Le SDK gère le cycle de vie du token.

## Initialiser le SDK [Côté client]

L’objet [StripeTerminal](https://docs.stripe.com/terminal/references/api/js-sdk.md#stripeterminal-create) fourni par le SDK présente une interface générique permettant de rechercher un lecteur, de se connecter à un lecteur et de créer des paiements. Afin de lancer une instance `StripeTerminal` sur votre application JavaScript, renseignez la fonction `ConnectionToken` mise en œuvre à [l’étape&nbsp;2](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token).

Vous devez également fournir une fonction pour traiter les déconnexions inattendues du lecteur, [onUnexpectedReaderDisconnect](https://docs.stripe.com/terminal/references/api/js-sdk.md#stripeterminal-create). Dans le cadre de cette fonction, votre application doit informer l’utilisateur de la déconnexion du lecteur. Vous pouvez également inclure un moyen de tenter une reconnexion à un lecteur. Pour en savoir plus, consultez la page [Traitement des déconnexions](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=js&reader-type=internet#handling-disconnects).

```javascript
const terminal = StripeTerminal.create({
  onFetchConnectionToken: fetchConnectionToken,
  onUnexpectedReaderDisconnect: unexpectedDisconnect,
});

function unexpectedDisconnect() {
  // You might want to display UI to notify the user and start re-discovering readers
}
```

## Mises à jour du SDK

Stripe publie régulièrement des mises à jour qui peuvent inclure de nouvelles fonctionnalités, des corrections de bugs et des mises à jour de sécurité. Mettez à jour votre SDK dès qu’une nouvelle version est disponible. Les SDK actuellement disponibles sont les suivants&nbsp;:

- [SDK Stripe Terminal Android](https://github.com/stripe/stripe-terminal-android/releases)
- [SDK Stripe Terminal iOS](https://github.com/stripe/stripe-terminal-ios/releases)
- [SDK Stripe Terminal JavaScript](https://docs.stripe.com/terminal/references/api/js-sdk.md#changelog)
- [SDK Stripe Terminal React Native](https://github.com/stripe/stripe-terminal-react-native)

## Navigateurs pris en charge

Nous mettons tout en œuvre pour que le SDK JavaScript Stripe Terminal prenne en charge toutes les versions récentes des principaux navigateurs. Nous prenons en charge les fonctionnalités suivantes&nbsp;:

- Edge sur Windows.
- Firefox pour ordinateur de bureau.
- Chrome et Safari, toutes plateformes.
- Le navigateur natif Android sur Android 4.4 et versions ultérieures.

Si vous rencontrez des problèmes avec le SDK JavaScript Stripe Terminal sur un navigateur donné, veuillez envoyer un e-mail à [support-terminal@stripe.com](mailto:support-terminal@stripe.com).

> Remarque&nbsp;: L’utilisation du SDK JavaScript de Stripe Terminal avec React Native n’est pas prise en charge. Pour intégrer Stripe Terminal à votre application mobile avec React Native, utilisez le [SDK Stripe Terminal React Native](https://github.com/stripe/stripe-terminal-react-native).

## Prochaines étapes

- [Se connecter à un lecteur](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=js&reader-type=internet)


# iOS

> This is a iOS for when terminal-sdk-platform is ios. View the full page at https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=ios.

Si vous recherchez un document qui décrit plus en détail les méthodes, objets et erreurs disponibles, consultez notre [documentation complète sur les SDK](https://stripe.dev/stripe-terminal-ios).

Pour démarrer avec le SDK iOS, suivez ces quatre étapes&nbsp;:

1. [Installer le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#install) dans votre application.
1. [Configurer](https://docs.stripe.com/terminal/payments/setup-integration.md#configure) votre application.
1. [Configurer l’endpoint du token de connexion](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token) dans votre application et votre back-end.
1. [Initialiser le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#initialize) dans votre application.

## Installer le SDK [Côté client]

Le SDK Stripe Terminal iOS est compatible avec les applications qui&nbsp;:

- Prennent en charge iOS&nbsp;13 et les versions ultérieures
- Sont installés avec CocoaPods, Swift Package Manager, ou en intégrant manuellement le framework

#### Cocoapods

1. Si vous ne l’avez pas encore fait, installez la version la plus récente de [CocoaPods](https://guides.cocoapods.org/using/getting-started.html).

1. Si vous n’avez pas de fichier [Podfile](https://guides.cocoapods.org/syntax/podfile.html), exécutez la commande suivante pour en créer un&nbsp;:

   ```bash
   pod init
   ```

1. Ajoutez cette ligne à votre Podfile&nbsp;:

   ```podfile
   pod 'StripeTerminal', '~> 5.0'
   ```

1. Exécutez la commande suivante&nbsp;:

   ```bash
   pod install
   ```

1. À partir de maintenant, utilisez le fichier `.xcworkspace` au lieu de `.xcodeproj` pour ouvrir votre projet dans Xcode.

#### Swift Package Manager

1. Dans Xcode, sélectionnez **Fichier** > **Ajouter des packages…** dans la barre de menus.
1. Saisissez l’URL Github du SDK iOS Terminal Stripe&nbsp;: `https://github.com/stripe/stripe-terminal-ios`
1. Saisissez la version SDK que vous souhaitez installer dans votre projet. La valeur par défaut «&nbsp;Up to Next Major&nbsp;» vous aidera à installer les mises à jour de sécurité et de fonctionnalité sans entraîner de changements brutaux et imprévus.

#### Manuel

1. Visitez le référentiel de Stripe Terminal iOS sur GitHub et accédez à la [dernière version en date](https://github.com/stripe/stripe-terminal-ios/releases).
1. Téléchargez le fichier `StripeTerminal.xcframework.zip` joint à la version GitHub.
1. Décompressez le fichier, plus glissez-déposez le XCFramework dans votre projet Xcode.
1. S’il n’est pas possible de charger les symboles de l’infrastructure logicielle, rendez-vous dans le volet «&nbsp;General&nbsp;» (Général) de votre cible et trouvez la liste déroulante «&nbsp;Frameworks, Libraries, and Embedded Content&nbsp;» (Infrastructures logicielles, bibliothèques et contenus intégrés). Dans `StripeTerminal.xcframework`, remplacez «&nbsp;Do Not Embed&nbsp;» (Ne pas intégrer) par «&nbsp;Embed and Sign&nbsp;» (Intégrer et signer).

> Pour plus de détails sur la dernière version du SDK et les versions précédentes, consultez la page [Releases](https://github.com/stripe/stripe-terminal-ios/releases) sur GitHub. Pour recevoir des notifications lorsqu’une nouvelle version est publiée, [surveillez les versions du dépôt](https://docs.github.com/en/github/managing-subscriptions-and-notifications-on-github/configuring-notifications#configuring-your-watch-settings-for-an-individual-repository) ou [abonnez-vous au flux RSS GitHub Releases](https://github.com/stripe/stripe-terminal-ios/releases.atom).
> 
> Pour en savoir plus sur la migration depuis des versions antérieures du SDK iOS, consultez [le guide de migration du SDK Stripe Terminal](https://docs.stripe.com/terminal/references/sdk-migration-guide.md).

## Configurer votre application [Côté client]

Pour que votre application puisse fonctionner avec le SDK Stripe Terminal, apportez quelques modifications à votre fichier **Info.plist** dans Xcode.

1. Activez les services de localisation avec la paire clé-valeur suivante.

| Confidentialité – Description de l’utilisation de l’emplacement, le cas échéant |
| ------------------------------------------------------------------------------- |
| **Clé**                                                                         | [NSLocationWhenInUseUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/nslocationwheninuseusagedescription) |
| **Valeur**                                                                      | **L’accès à l’emplacement est indispensable pour accepter des paiements.**                                                                                     |

   Afin de réduire les risques de fraude associés aux paiements et de limiter le nombre de litiges, Stripe a besoin de connaître le lieu où se déroulent les paiements. Si le SDK ne peut déterminer l’emplacement de l’appareil iOS, les paiements sont désactivés jusqu’à ce que l’accès à l’emplacement soit rétabli.

1. Assurez-vous que votre application fonctionne en arrière-plan et reste connectée aux lecteurs Bluetooth.

| Modes d’arrière-plan requis pour les lecteurs Bluetooth |
| ------------------------------------------------------- |
| **Clé**                                                 | [UIBackgroundModes](https://developer.apple.com/documentation/bundleresources/information_property_list/uibackgroundmodes) |
| **Valeur**                                              | **bluetooth-central** (Utilise les accessoires Bluetooth LE)                                                               |

   La configuration du mode d’arrière-plan [bluetooth-central](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html#//apple_ref/doc/uid/TP40013257-CH7-SW6) permet au lecteur de rester en mode veille lorsque votre application est exécutée en arrière-plan, ou lorsque l’appareil iOS est verrouillé. Sans cette valeur, la mise en veille échoue. Lorsque votre application est exécutée en arrière-plan, le lecteur est susceptible de s’éteindre automatiquement afin d’économiser de l’énergie.

1. Autorisez votre application à afficher une boîte de dialogue d’autorisation Bluetooth. L’App&nbsp;Store exige l’intégration de cette option, même si votre application ne prend pas en charge la connexion aux lecteurs Bluetooth.

| Confidentialité – Description de l’utilisation systématique du Bluetooth |
| ------------------------------------------------------------------------ |
| **Clé**                                                                  | [NSBluetoothAlwaysUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/NSBluetoothAlwaysUsageDescription) |
| **Valeur**                                                               | **Cette application utilise le Bluetooth pour se connecter aux lecteurs de cartes bancaires pris en charge.**                                              |

   iOS&nbsp;13 propose désormais des autorisations plus spécifiques concernant l’utilisation de périphériques Bluetooth par une application. Les applications associées à Core Bluetooth doivent inclure cette clé dans leur fichier Info.plist afin d’éviter que l’application ne plante lors de son premier lancement.

1. Passer les contrôles de validation de l’application lorsque vous la soumettez à l’App&nbsp;Store. À partir de la version 3.4.0 du SDK, cette exigence d’autorisation est supprimée.

| Confidentialité – Description de l’utilisation du périphérique Bluetooth |
| ------------------------------------------------------------------------ |
| **Clé**                                                                  | [NSBluetoothPeripheralUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/nsbluetoothperipheralusagedescription) |
| **Valeur**                                                               | **La connexion aux lecteurs de cartes pris en charge nécessite un accès au Bluetooth.**                                                                            |

   Ceci est un exemple&nbsp;; vous pouvez reformuler la demande d’autorisation de l’utilisateur dans votre application.

1. Sauvegardez le fichier **Info.plist** de votre application. Il est désormais correctement configuré et peut être utilisé avec le SDK Stripe Terminal.

> Si vous utilisez Tap to Pay sur iPhone, vous devez [demander et configurer](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone) le droit de développement Tap to Pay sur iPhone à partir de votre compte Apple Developer.

## Configurer l'endpoint ConnectionToken [Côté serveur] [Côté client]

### Côté serveur

Pour se connecter à un lecteur, votre back-end doit donner au SDK la permission d’utiliser le lecteur avec votre compte Stripe en lui fournissant la [clé secrète](https://docs.stripe.com/api/terminal/connection_tokens/object.md#terminal_connection_token_object-secret) d’un [ConnectionToken](https://docs.stripe.com/api/terminal/connection_tokens.md). Votre back-end doit créer des tokens de connexion uniquement pour les clients qu’il reconnaît comme fiables.

#### curl

```bash
curl https://api.stripe.com/v1/terminal/connection_tokens \
  -u <<YOUR_SECRET_KEY>>: \
  -X "POST"
```

#### Ruby

```ruby

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = Stripe::Terminal::ConnectionToken.create
```

#### Python

```python

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = stripe.terminal.ConnectionToken.create()
```

#### PHP

```php

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
$connectionToken = \Stripe\Terminal\ConnectionToken::create();
```

#### Java

```java

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
ConnectionTokenCreateParams params =
  ConnectionTokenCreateParams.builder()
    .build();

ConnectionToken connectionToken = ConnectionToken.create(params);
```

#### Node.js

```javascript

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
let connectionToken = stripe.terminal.connectionTokens.create();
```

#### Go

```go

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<YOUR_SECRET_KEY>>"

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
params := &stripe.TerminalConnectionTokenParams{}
ct, _ := connectiontoken.New(params)
```

#### .NET

```csharp

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
var options = new ConnectionTokenCreateOptions{};
var service = new ConnectionTokenService();
var connectionToken = service.Create(options);
```

Obtenez la clé secrète à partir du `ConnectionToken` sur votre serveur et transmettez-la côté client.

#### Ruby

```ruby
post '/connection_token' do
  token = # ... Create or retrieve the ConnectionToken
  {secret: token.secret}.to_json
end
```

#### Python

```python
from flask import jsonify

@app.route('/connection_token', methods=['POST'])
def token():
  token = # ... Create or retrieve the ConnectionToken
  return jsonify(secret=token.secret)
```

#### PHP

```php
<?php
    $token = # ... Create or retrieve the ConnectionToken
    echo json_encode(array('secret' => $token->secret));
?>
```

#### Java

```java
import java.util.HashMap;
import java.util.Map;

import com.stripe.model.ConnectionToken;

import com.google.gson.Gson;
import static spark.Spark.post;

public class StripeJavaQuickStart {
    public static void main(String[] args) {
      Gson gson = new Gson();

      post("/connection_token", (request, response) -> {
        ConnectionToken token = // ... Fetch or create the ConnectionToken

        Map<String, String> map = new HashMap();
        map.put("secret", token.getSecret());

        return map;
      }, gson::toJson);
    }
}
```

#### Node.js

```javascript
const express = require('express');
const app = express();

app.post('/connection_token', async (req, res) => {
  const token = // ... Fetch or create the ConnectionToken
  res.json({secret: token.secret});
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
```

#### Go

```go
package main

import (
  "encoding/json"
  "net/http"
)

type TokenData struct {
  Secret string `json:"secret"`
}

func main() {
  http.HandleFunc("/connection_token", func(w http.ResponseWriter, r *http.Request) {
    token := // ... Fetch or create the ConnectionToken
    data := TokenData{
      Secret: token.secret,
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(data)
  })

  http.ListenAndServe(":3000", nil)
}
```

#### .NET

```csharp
using System;
using Microsoft.AspNetCore.Mvc;

namespace StripeExampleApi.Controllers
{
    [Route("connection_token")]
    [ApiController]
    public class StripeApiController : Controller
    {
        [HttpPost]
        public ActionResult Post()
        {
            var token = // ... Fetch or create the ConnectionToken
            return Json(new {secret = token.Secret});
        }
    }
}
```

> Le `secret` du `ConnectionToken` vous permet de vous connecter à n’importe quel lecteur Stripe Terminal et de traiter les paiements à l’aide de votre compte Stripe. Veillez à authentifier l’endpoint pour créer des tokens de connexion et à le protéger contre la falsification des requêtes intersites (CSRF).

### Côté client

Afin de permettre au SDK d’accéder à cet endpoint, déployez le protocole [ConnectionTokenProvider](https://stripe.dev/stripe-terminal-ios/docs/Protocols/SCPConnectionTokenProvider.html) dans votre application. Celui-ci définit une fonction unique qui demande un `ConnectionToken` à votre back-end.

```swift
import StripeTerminal

// Example API client class for communicating with your backend
class APIClient: ConnectionTokenProvider {

    // For simplicity, this example class is a singleton
    static let shared = APIClient()

    // Fetches a ConnectionToken from your backend
    func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        let config = URLSessionConfiguration.default
        let session = URLSession(configuration: config)
        guard let url = URL(string: "https://{{YOUR_BACKEND_URL}}/connection_token") else {
            fatalError("Invalid backend URL")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let task = session.dataTask(with: request) { (data, response, error) in
            if let data = data {
                do {
                    // Warning: casting using `as? [String: String]` looks simpler, but isn't safe:
                    let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
                    if let secret = json?["secret"] as? String {
                        completion(secret, nil)
                    }
                    else {
                        let error = NSError(domain: "com.stripe-terminal-ios.example",
                                            code: 2000,
                                            userInfo: [NSLocalizedDescriptionKey: "Missing `secret` in ConnectionToken JSON response"])
                        completion(nil, error)
                    }
                }
                catch {
                    completion(nil, error)
                }
            }
            else {
                let error = NSError(domain: "com.stripe-terminal-ios.example",
                                    code: 1000,
                                    userInfo: [NSLocalizedDescriptionKey: "No data in response from ConnectionToken endpoint"])
                completion(nil, error)
            }
        }
        task.resume()
    }
}
```

```objc
#import <StripeTerminal/StripeTerminal.h>

// Example API client class for communicating with your backend
@interface APPAPIClient : NSObject <SCPConnectionTokenProvider>

// For simplicity, this example class is a singleton
+ (instancetype)shared;

@end
```

```objc
#import "APPAPIClient.h"

@implementation APPAPIClient

+ (instancetype)shared {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _shared = [APPAPIClient new];
    });
    return _shared;
}

// Fetches a ConnectionToken from your backend
- (void)fetchConnectionToken:(SCPConnectionTokenCompletionBlock)completion {
    NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
    NSURLSession *session = [NSURLSession sessionWithConfiguration:config];
    NSURL *url = [NSURL URLWithString:@"https://{{YOUR_BACKEND_URL}}/connection_token"];
    if (!url) {
        NSAssert(NO, @"Invalid backend URL");
    }
    NSMutableURLRequest *request = [[NSMutableURLRequest alloc] initWithURL:url];
    request.HTTPMethod = @"POST";
    NSURLSessionDataTask *task = [session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        id jsonObject = nil;
        NSError *jsonSerializationError;
        if (data) {
            jsonObject = [NSJSONSerialization JSONObjectWithData:data options:(NSJSONReadingOptions)kNilOptions error:&jsonSerializationError];
        }
        else {
            NSError *error = [NSError errorWithDomain:@"com.stripe-terminal-ios.example"
                                                 code:1000
                                             userInfo:@{NSLocalizedDescriptionKey: @"No data in response from ConnectionToken endpoint"}];
            completion(nil, error);
        }
        if (!(jsonObject && [jsonObject isKindOfClass:[NSDictionary class]])) {
            completion(nil, jsonSerializationError);
            return;
        }
        NSDictionary *json = (NSDictionary *)jsonObject;
        id secret = json[@"secret"];
        if (!(secret && [secret isKindOfClass:[NSString class]])) {
            NSError *error = [NSError errorWithDomain:@"com.stripe-terminal-ios.example"
                                                 code:2000
                                             userInfo:@{NSLocalizedDescriptionKey: @"Missing `secret` in ConnectionToken JSON response"}];
            completion(nil, error);
            return;
        }
        completion((NSString *)secret, nil);
    }];
    [task resume];
}

// ...

@end
```

Cette fonction est appelée dès lors que le SDK doit s’authentifier auprès de Stripe ou du lecteur. Elle est également appelée lorsqu’un nouveau token est nécessaire pour se connecter à un lecteur (par exemple, lorsque votre application s’est déconnectée du lecteur). Si le SDK n’est pas en mesure de récupérer un nouveau jeton de connexion depuis votre backend, la connexion au lecteur échoue associée à une erreur de votre serveur.

> Ne mettez pas en cache et ne codez pas en dur le token de connexion. Le SDK gère le cycle de vie du token.

> #### Épinglage des certificats
> 
> Dans la plupart des cas, vous ne devez pas configurer votre application avec l’épinglage de certificats. Si votre application l’exige, consultez la documentation sur l’[épinglage des certificats](https://docs.stripe.com/tls-certificates.md#certificate-pinning).

## Initialiser le SDK [Côté client]

La classe [Terminal](https://stripe.dev/stripe-terminal-ios/docs/Classes/SCPTerminal.html) mise à disposition par le SDK Stripe Terminal dispose d’une interface générique permettant de détecter les lecteurs, de se connecter à un lecteur et d’effectuer des opérations sur le lecteur, telles que l’affichage des informations du panier, l’encaissement de paiements et l’enregistrement de cartes bancaires pour une utilisation ultérieure.

Pour démarrer, fournissez votre `ConnectionTokenProvider` utilisé à [l’étape&nbsp;3](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token). Vous ne pouvez appeler `setTokenProvider` qu’une seule fois dans votre application, et devez le faire avant d’accéder à `Terminal.shared`. Nous vous recommandons d’appeler `setTokenProvider` en utilisant la méthode `application:didFinishLaunchingWithOptions` de votre AppDelegate. Vous pouvez également utiliser `dispatch_once` dans Objective-C, ou un constructeur `statique` dans Swift.

```swift
import UIKit
import StripeTerminal

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        Terminal.initWithTokenProvider(APIClient.shared)
        // ...
        return true
    }

    // ...

}
```

```objc
#import "APPAppDelegate.h"
#import <StripeTerminal/StripeTerminal.h>
#import "APPAPIClient.h"

@implementation APPAppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    [SCPTerminal initWithTokenProvider:[APPAPIClient shared]];
    // ...
    return YES;
}

// ...

@end
```

## Mises à jour du SDK

Stripe publie régulièrement des mises à jour qui peuvent inclure de nouvelles fonctionnalités, des corrections de bugs et des mises à jour de sécurité. Mettez à jour votre SDK dès qu’une nouvelle version est disponible. Les SDK actuellement disponibles sont les suivants&nbsp;:

- [SDK Stripe Terminal Android](https://github.com/stripe/stripe-terminal-android/releases)
- [SDK Stripe Terminal iOS](https://github.com/stripe/stripe-terminal-ios/releases)
- [SDK Stripe Terminal JavaScript](https://docs.stripe.com/terminal/references/api/js-sdk.md#changelog)
- [SDK Stripe Terminal React Native](https://github.com/stripe/stripe-terminal-react-native)

## Prochaines étapes

- [Se connecter à un lecteur](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=ios&reader-type=internet)


# Android

> This is a Android for when terminal-sdk-platform is android. View the full page at https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=android.

Pour obtenir plus informations sur l’ensemble des méthodes, des objets et des erreurs disponibles, consultez notre [documentation complète sur les SDK](https://stripe.dev/stripe-terminal-android/).

Pour démarrer avec le SDK Android, suivez ces quatre étapes&nbsp;:

1. [Installer le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#install) dans votre application.
1. [Configurer](https://docs.stripe.com/terminal/payments/setup-integration.md#configure) votre application.
1. [Configurer l’endpoint du token de connexion](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token) dans votre application et votre back-end.
1. [Initialiser le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#initialize) dans votre application.

## Installer le SDK [Côté client]

> Le SDK n’est plus compatible avec les bibliothèques d’assistance, car nous utilisons Room pour enregistrer et gérer l’état de l’application tout au long de son cycle de vie. Assurez-vous que votre application a migré vers AndroidX.

Pour installer le SDK, ajoutez `stripeterminal` au bloc `dependencies` du [fichier build de votre application](https://developer.android.com/studio/build/dependencies)&nbsp;:

#### Kotlin

```kotlin
plugins {
  id("com.android.application")
}

android { ... }

dependencies {
  implementation("com.stripe:stripeterminal:5.0.0")
  // ...
}
```

#### Groovy

```groovy
apply plugin: 'com.android.application'

android { ... }

dependencies {
  implementation "com.stripe:stripeterminal:5.0.0"
  // ...
}
```

### (Facultatif) Prise en charge des coroutines Kotlin

SDK version 5.0.0 includes an optional module, `stripeterminal-ktx`. This module provides `suspend` function wrappers for asynchronous Terminal APIs, allowing you to write simple, sequential code instead of nesting callbacks.

Pour l’utiliser, ajoutez sa dépendance&nbsp;:

#### Kotlin

```kotlin

dependencies {
  implementation("com.stripe:stripeterminal:5.0.0")
  // Add the coroutines module
  implementation("com.stripe:stripeterminal-ktx:5.0.0")
  // ...
}
```

#### Groovy

```groovy

dependencies {
  implementation "com.stripe:stripeterminal:5.0.0"
  // Add the coroutines module
  implementation "com.stripe:stripeterminal-ktx:5.0.0"
  // ...
}
```

Voir un exemple de ce modèle d’intégration dans notre [application Kotlin exemple](https://github.com/stripe/stripe-terminal-android/tree/master/Example/kotlinapp) sur GitHub.

### Définir la version Java cible

Ensuite, étant donné que le SDK repose sur Java 8, le fichier de build de votre application doit l’indiquer en précisant la version Java cible&nbsp;:

#### Kotlin

```kotlin
android {
  // ...
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}
```

#### Groovy

```groovy
compileOptions {
    sourceCompatibility JavaVersion.VERSION_1_8
    targetCompatibility JavaVersion.VERSION_1_8
}
```

> Pour obtenir de plus amples informations sur la version la plus récente du SDK et ses versions antérieures, consultez la page des [versions](https://github.com/stripe/stripe-terminal-android/releases) sur GitHub. Pour savoir quand une nouvelle version est disponible, [surveillez les versions du référentiel](https://docs.github.com/en/github/managing-subscriptions-and-notifications-on-github/configuring-notifications#configuring-your-watch-settings-for-an-individual-repository).
> 
> Pour en savoir plus sur la migration à partir de versions antérieures ou bêta du SDK Android, consultez le [guide de migration Stripe Terminal](https://docs.stripe.com/terminal/references/sdk-migration-guide.md).

## Configurer votre application [Côté client]

Vous devez activer l’autorisation `ACCESS_FINE_LOCATION`. Pour connecter un lecteur Bluetooth, vous devez également activer les autorisations Bluetooth. Ajoutez les autorisations appropriées à votre manifeste, comme indiqué ici&nbsp;:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
```

Avant d’initialiser l’objet [Terminal](https://stripe.dev/stripe-terminal-android/core/com.stripe.stripeterminal/-terminal/index.html), ajoutez la vérification suivante afin de vérifier que l’autorisation `ACCESS_FINE_LOCATION` est activée dans votre application&nbsp;:

```kotlin
if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
    val permissions = arrayOf(android.Manifest.permission.ACCESS_FINE_LOCATION)
    ActivityCompat.requestPermissions(this, permissions, REQUEST_CODE_LOCATION)
}
```

```java
if (ContextCompat.checkSelfPermission(getActivity(),
        android.Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
    String[] permissions = {
        android.Manifest.permission.ACCESS_FINE_LOCATION
    };
    ActivityCompat.requestPermissions(getActivity(), permissions, REQUEST_CODE_LOCATION);
}
```

Vérifiez également que l’utilisateur de l’application accorde l’autorisation d’accéder aux emplacements&nbsp;; le SDK ne peut fonctionner sans elle. À cet effet, remplacez la méthode `onRequestPermissionsResult` dans votre application et vérifiez le résultat de l’autorisation.

```kotlin
override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<String>,
    grantResults: IntArray
) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)

    if (requestCode == REQUEST_CODE_LOCATION && grantResults.isNotEmpty()
        && grantResults[0] != PackageManager.PERMISSION_GRANTED
    ) {
        throw RuntimeException("Location services are required to connect to a reader.")
    }
}
```

```java
@Override
public void onRequestPermissionsResult(
    int requestCode,
    @NotNull String[] permissions,
    @NotNull int[] grantResults
) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);

    if (requestCode == REQUEST_CODE_LOCATION && grantResults.length > 0 &&
        grantResults[0] != PackageManager.PERMISSION_GRANTED) {
        throw new RuntimeException("Location services are required to connect to a reader.");
    }
}
```

Vous devez également vous assurer que les services de localisation et de Bluetooth sont activés sur l’appareil, et pas seulement pour l’application. Voici un exemple de ce à quoi cela peut ressembler dans les paramètres de l’appareil&nbsp;:
![Capture d’écran de la page des paramètres de localisation sur un appareil Android.](https://b.stripecdn.com/docs-statics-srv/assets/android-example-location-settings.af2781f0325786bd2ecb26b19e3b3a2f.png)

Paramètres d’emplacement
![Capture d’écran de la page des paramètres Bluetooth sur un appareil Android.](https://b.stripecdn.com/docs-statics-srv/assets/android-example-bluetooth-settings.f5878ba77b1375006165dff2719725f3.png)

Paramètres Bluetooth

> Afin de réduire les risques de fraude associés aux paiements, et de limiter le nombre de litiges, Stripe a besoin de connaître le lieu où se déroulent les paiements. Si le SDK ne peut déterminer l’emplacement de l’appareil Android, les paiements sont désactivés jusqu’à ce que l’accès à l’emplacement soit rétabli.

## Configurer l'endpoint ConnectionToken [Côté serveur] [Côté client]

### Côté serveur

Pour se connecter à un lecteur, votre back-end doit donner au SDK la permission d’utiliser le lecteur avec votre compte Stripe en lui fournissant la [clé secrète](https://docs.stripe.com/api/terminal/connection_tokens/object.md#terminal_connection_token_object-secret) d’un [ConnectionToken](https://docs.stripe.com/api/terminal/connection_tokens.md). Votre back-end doit créer des tokens de connexion uniquement pour les clients qu’il reconnaît comme fiables.

#### curl

```bash
curl https://api.stripe.com/v1/terminal/connection_tokens \
  -u <<YOUR_SECRET_KEY>>: \
  -X "POST"
```

#### Ruby

```ruby

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = Stripe::Terminal::ConnectionToken.create
```

#### Python

```python

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = stripe.terminal.ConnectionToken.create()
```

#### PHP

```php

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
$connectionToken = \Stripe\Terminal\ConnectionToken::create();
```

#### Java

```java

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
ConnectionTokenCreateParams params =
  ConnectionTokenCreateParams.builder()
    .build();

ConnectionToken connectionToken = ConnectionToken.create(params);
```

#### Node.js

```javascript

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
let connectionToken = stripe.terminal.connectionTokens.create();
```

#### Go

```go

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<YOUR_SECRET_KEY>>"

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
params := &stripe.TerminalConnectionTokenParams{}
ct, _ := connectiontoken.New(params)
```

#### .NET

```csharp

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
var options = new ConnectionTokenCreateOptions{};
var service = new ConnectionTokenService();
var connectionToken = service.Create(options);
```

Obtenez la clé secrète à partir du `ConnectionToken` sur votre serveur et transmettez-la côté client.

#### Ruby

```ruby
post '/connection_token' do
  token = # ... Create or retrieve the ConnectionToken
  {secret: token.secret}.to_json
end
```

#### Python

```python
from flask import jsonify

@app.route('/connection_token', methods=['POST'])
def token():
  token = # ... Create or retrieve the ConnectionToken
  return jsonify(secret=token.secret)
```

#### PHP

```php
<?php
    $token = # ... Create or retrieve the ConnectionToken
    echo json_encode(array('secret' => $token->secret));
?>
```

#### Java

```java
import java.util.HashMap;
import java.util.Map;

import com.stripe.model.ConnectionToken;

import com.google.gson.Gson;
import static spark.Spark.post;

public class StripeJavaQuickStart {
    public static void main(String[] args) {
      Gson gson = new Gson();

      post("/connection_token", (request, response) -> {
        ConnectionToken token = // ... Fetch or create the ConnectionToken

        Map<String, String> map = new HashMap();
        map.put("secret", token.getSecret());

        return map;
      }, gson::toJson);
    }
}
```

#### Node.js

```javascript
const express = require('express');
const app = express();

app.post('/connection_token', async (req, res) => {
  const token = // ... Fetch or create the ConnectionToken
  res.json({secret: token.secret});
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
```

#### Go

```go
package main

import (
  "encoding/json"
  "net/http"
)

type TokenData struct {
  Secret string `json:"secret"`
}

func main() {
  http.HandleFunc("/connection_token", func(w http.ResponseWriter, r *http.Request) {
    token := // ... Fetch or create the ConnectionToken
    data := TokenData{
      Secret: token.secret,
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(data)
  })

  http.ListenAndServe(":3000", nil)
}
```

#### .NET

```csharp
using System;
using Microsoft.AspNetCore.Mvc;

namespace StripeExampleApi.Controllers
{
    [Route("connection_token")]
    [ApiController]
    public class StripeApiController : Controller
    {
        [HttpPost]
        public ActionResult Post()
        {
            var token = // ... Fetch or create the ConnectionToken
            return Json(new {secret = token.Secret});
        }
    }
}
```

> Le `secret` du `ConnectionToken` vous permet de vous connecter à n’importe quel lecteur Stripe Terminal et de traiter les paiements à l’aide de votre compte Stripe. Veillez à authentifier l’endpoint pour créer des tokens de connexion et à le protéger contre la falsification des requêtes intersites (CSRF).

### Côté client

Afin de permettre au SDK d’accéder à cet endpoint, déployez l’interface [ConnectionTokenProvider](https://stripe.dev/stripe-terminal-android/external/com.stripe.stripeterminal.external.callable/-connection-token-provider/index.html) dans votre application. Celle-ci définit une fonction unique qui demande un `ConnectionToken` à votre back-end.

```kotlin
class CustomConnectionTokenProvider : ConnectionTokenProvider {
    override fun fetchConnectionToken(callback: ConnectionTokenCallback) {
        try {
            // Your backend should call /v1/terminal/connection_tokens and return the
            // JSON response from Stripe. When the request to your backend succeeds,
            // return the `secret` from the response to the SDK.
            callback.onSuccess(secret)
        } catch (e: Exception) {
            callback.onFailure(
                ConnectionTokenException("Failed to fetch connection token", e)
            )
        }
    }
}
```

```java
public class CustomConnectionTokenProvider implements ConnectionTokenProvider {
    @Override
    public void fetchConnectionToken(ConnectionTokenCallback callback) {
        try {
            // Your backend should call /v1/terminal/connection_tokens and return the
            // JSON response from Stripe. When the request to your backend succeeds,
            // return the `secret` from the response to the SDK.
            callback.onSuccess(secret);
        } catch (Exception e) {
            callback.onFailure(
                new ConnectionTokenException("Failed to fetch connection token", e));
        }
    }
}
```

Cette fonction est appelée dès lors que le SDK doit s’authentifier auprès de Stripe ou du lecteur. Elle est également appelée lorsqu’un nouveau token est nécessaire pour se connecter à un lecteur (par exemple, lorsque votre application s’est déconnectée du lecteur). Si le SDK n’est pas en mesure de récupérer un nouveau jeton de connexion depuis votre backend, la connexion au lecteur échoue associée à une erreur de votre serveur.

> Ne mettez pas en cache et ne codez pas en dur le token de connexion. Le SDK gère le cycle de vie du token.

> #### Épinglage des certificats
> 
> Dans la plupart des cas, vous ne devez pas configurer votre application avec l’épinglage de certificats. Si votre application l’exige, consultez la documentation sur l’[épinglage des certificats](https://docs.stripe.com/tls-certificates.md#certificate-pinning).

## Initialiser le SDK [Côté client]

Le SDK Android est sensible au cycle de vie. Pour éviter les fuites de mémoire et garantir un nettoyage approprié des processus de longue durée du SDK Terminal, votre application doit implémenter une sous-classe `Application` qui utilise `TerminalApplicationDelegate.onCreate()` pour informer le SDK des événements de cycle de vie.

```kotlin
// Substitute with your application name, and remember to keep it the same as your AndroidManifest.xml
class StripeTerminalApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        TerminalApplicationDelegate.onCreate(this)
    }
}
```

```java
// Substitute with your application name, and remember to keep it the same as your AndroidManifest.xml
class StripeTerminalApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        TerminalApplicationDelegate.onCreate(this);
    }
}
```

> Si vous souhaitez utiliser Tap to Pay sur Android (TTPA), l’initialisation dans `Application` est légèrement différente de cet exemple. Consultez [Se connecter à un lecteur avec TTPA](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=android&reader-type=tap-to-pay#initialize).

La classe [Terminal](https://stripe.dev/stripe-terminal-android/core/com.stripe.stripeterminal/-terminal/index.html) mise à disposition par le SDK Stripe Terminal dispose d’une interface générique permettant de détecter les lecteurs, de se connecter à un lecteur et d’effectuer des opérations sur le lecteur, telles que l’affichage des informations du panier, l’encaissement de paiements et l’enregistrement de cartes bancaires pour une utilisation ultérieure.

Pour commencer, fournissez le contexte actuel de l’application, le [ConnectionTokenProvider](https://stripe.dev/stripe-terminal-android/external/com.stripe.stripeterminal.external.callable/-connection-token-provider/index.html) implémenté à l’[Étape 3](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token) et un objet [TerminalListener](https://stripe.dev/stripe-terminal-android/external/com.stripe.stripeterminal.external.callable/-terminal-listener/index.html). Vous pouvez utiliser cet écouteur pour gérer des événements tels que des paiements et des mises à jour de l’état de la connexion à partir du SDK.

```kotlin
// Create your listener object. Override any methods that you want to be notified about
val listener = object : TerminalListener {
    override fun onConnectionStatusChange(status: ConnectionStatus) {
        println("onConnectionStatusChange: $status");
    }

    override fun onPaymentStatusChange(status: PaymentStatus) {
        println("onPaymentStatusChange: $status");
    }
}

// Choose the level of messages that should be logged to your console
val logLevel = LogLevel.VERBOSE

// Create your token provider.
val tokenProvider = CustomConnectionTokenProvider()

// Pass in the current application context, your desired logging level, your token provider, and the listener you created
if (!Terminal.isInitialized()) {
    Terminal.init(applicationContext, logLevel, tokenProvider, listener, offlineListener)
}

// Since the Terminal is a singleton, you can call getInstance whenever you need it
Terminal.getInstance()
```

```java
// Create your listener object. Override any methods that you want to be notified about
TerminalListener listener = new TerminalListener() {
    @Override
    public void onConnectionStatusChange(ConnectionStatus status) {
        System.out.printf("onConnectionStatusChange: %s\n", status);
    }

    @Override
    public void onPaymentStatusChange(PaymentStatus status) {
        System.out.printf("onPaymentStatusChange: %s\n ", status);
    }
};

// Choose the level of messages that should be logged to your console
LogLevel logLevel = LogLevel.VERBOSE;

// Create your token provider.
CustomConnectionTokenProvider tokenProvider = new CustomConnectionTokenProvider();

// Pass in the current application context, your desired logging level, your token provider, and the listener you created
if (!Terminal.isInitialized()) {
    Terminal.init(getApplicationContext(), logLevel, tokenProvider, listener, offlineListener);
}

// Since the Terminal is a singleton, you can call getInstance whenever you need it
Terminal.getInstance();
```

## Mises à jour du SDK

Stripe publie régulièrement des mises à jour qui peuvent inclure de nouvelles fonctionnalités, des corrections de bugs et des mises à jour de sécurité. Mettez à jour votre SDK dès qu’une nouvelle version est disponible. Les SDK actuellement disponibles sont les suivants&nbsp;:

- [SDK Stripe Terminal Android](https://github.com/stripe/stripe-terminal-android/releases)
- [SDK Stripe Terminal iOS](https://github.com/stripe/stripe-terminal-ios/releases)
- [SDK Stripe Terminal JavaScript](https://docs.stripe.com/terminal/references/api/js-sdk.md#changelog)
- [SDK Stripe Terminal React Native](https://github.com/stripe/stripe-terminal-react-native)

## Prochaines étapes

- [Se connecter à un lecteur](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=android&reader-type=internet)


# React Native

> This is a React Native for when terminal-sdk-platform is react-native. View the full page at https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=react-native.

> La bibliothèque React Native de Terminal est en cours de développement et disponible en [version bêta publique](https://docs.stripe.com/release-phases.md). Veuillez signaler tout problème dans notre projet [GitHub](https://github.com/stripe/stripe-terminal-react-native/issues/new/choose).

> Si vous créez une intégration **Applications sur des appareils** (exécutant votre application sur des lecteurs intelligents Stripe tels que le S700), vous devrez effectuer des étapes supplémentaires de [configuration Android native](https://docs.stripe.com/terminal/features/apps-on-devices/build.md?terminal-sdk-platform=react-native#setup-app) après avoir suivi ce guide.

Pour démarrer avec le SDK React Native, suivez ces quatre étapes&nbsp;:

1. [Installer le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#install) dans votre application.
1. [Configurer](https://docs.stripe.com/terminal/payments/setup-integration.md#configure) votre application.
1. [Configurer l’endpoint du token de connexion](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token) dans votre application et votre back-end.
1. [Initialiser le SDK](https://docs.stripe.com/terminal/payments/setup-integration.md#initialize) dans votre application.

## Installer le SDK [Côté client]

Le [SDK React Native](https://github.com/stripe/stripe-terminal-react-native) est disponible en open source et fait l’objet d’une documentation complète. En interne, il utilise les SDK iOS et Android natifs. Pour installer le SDK, veuillez exécuter&nbsp;:

#### NPM

```bash
npm install @stripe/stripe-terminal-react-native
```

#### Yarn

```bash
yarn add @stripe/stripe-terminal-react-native
```

#### Expo

```bash
npx expo install @stripe/stripe-terminal-react-native
```

## Configurer votre application [Côté client]

#### Interface de ligne de commande React Native

#### iOS

### Pods

Vous devez exécuter `pod install` dans votre répertoire `ios` pour installer les dépendances natives.

### Autorisations

Pour que votre application puisse fonctionner avec le SDK Stripe Terminal, apportez quelques modifications à votre fichier **Info.plist** dans Xcode.

1. Activez les services de localisation avec la paire clé-valeur suivante.

| Confidentialité – Description de l’utilisation de l’emplacement, le cas échéant |
| ------------------------------------------------------------------------------- |
| **Clé**                                                                         | [NSLocationWhenInUseUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/nslocationwheninuseusagedescription) |
| **Valeur**                                                                      | **L’accès à l’emplacement est indispensable pour accepter des paiements.**                                                                                     |

   Afin de réduire les risques de fraude associés aux paiements et de limiter le nombre de litiges, Stripe a besoin de connaître le lieu où se déroulent les paiements. Si le SDK ne peut déterminer l’emplacement de l’appareil iOS, les paiements sont désactivés jusqu’à ce que l’accès à l’emplacement soit rétabli.

1. Assurez-vous que votre application fonctionne en arrière-plan et reste connectée aux lecteurs Bluetooth.

| Modes d’arrière-plan requis pour les lecteurs Bluetooth |
| ------------------------------------------------------- |
| **Clé**                                                 | [UIBackgroundModes](https://developer.apple.com/documentation/bundleresources/information_property_list/uibackgroundmodes) |
| **Valeur**                                              | **bluetooth-central** (Utilise les accessoires Bluetooth LE)                                                               |

   La configuration du mode d’arrière-plan [bluetooth-central](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html#//apple_ref/doc/uid/TP40013257-CH7-SW6) permet au lecteur de rester en mode veille lorsque votre application est exécutée en arrière-plan, ou lorsque l’appareil iOS est verrouillé. Sans cette valeur, la mise en veille échoue. Lorsque votre application est exécutée en arrière-plan, le lecteur est susceptible de s’éteindre automatiquement afin d’économiser de l’énergie.

1. Autorisez votre application à afficher une boîte de dialogue d’autorisation Bluetooth. L’App&nbsp;Store exige l’intégration de cette option, même si votre application ne prend pas en charge la connexion aux lecteurs Bluetooth.

| Confidentialité – Description de l’utilisation systématique du Bluetooth |
| ------------------------------------------------------------------------ |
| **Clé**                                                                  | [NSBluetoothAlwaysUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/NSBluetoothAlwaysUsageDescription) |
| **Valeur**                                                               | **Cette application utilise le Bluetooth pour se connecter aux lecteurs de cartes bancaires pris en charge.**                                              |

   iOS&nbsp;13 propose désormais des autorisations plus spécifiques concernant l’utilisation de périphériques Bluetooth par une application. Les applications associées à Core Bluetooth doivent inclure cette clé dans leur fichier Info.plist afin d’éviter que l’application ne plante lors de son premier lancement.

1. Passer les contrôles de validation de l’application lorsque vous la soumettez à l’App&nbsp;Store. À partir de la version 3.4.0 du SDK, cette exigence d’autorisation est supprimée.

| Confidentialité – Description de l’utilisation du périphérique Bluetooth |
| ------------------------------------------------------------------------ |
| **Clé**                                                                  | [NSBluetoothPeripheralUsageDescription](https://developer.apple.com/documentation/bundleresources/information_property_list/nsbluetoothperipheralusagedescription) |
| **Valeur**                                                               | **La connexion aux lecteurs de cartes pris en charge nécessite un accès au Bluetooth.**                                                                            |

   Ceci est un exemple&nbsp;; vous pouvez reformuler la demande d’autorisation de l’utilisateur dans votre application.

1. Sauvegardez le fichier **Info.plist** de votre application. Il est désormais correctement configuré et peut être utilisé avec le SDK Stripe Terminal.

> Si vous utilisez Tap to Pay sur iPhone, vous devez [demander et configurer](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone) le droit de développement Tap to Pay sur iPhone à partir de votre compte Apple Developer.

#### Android

### Autorisations

Le SDK Stripe Terminal nécessite les autorisations Android suivantes pour fonctionner correctement&nbsp;:

- `PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT`
- `PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN`
- `PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION`

Utilisez la fonction utilitaire `requestNeededAndroidPermissions` pour demander automatiquement toutes les autorisations requises avant d’initialiser le SDK Terminal&nbsp;:

```js
import { requestNeededAndroidPermissions } from '@stripe/stripe-terminal-react-native';

try {
  const granted = await requestNeededAndroidPermissions({
    accessFineLocation: {
      title: 'Location Permission',
      message: 'Stripe Terminal needs access to your location',
      buttonPositive: 'Accept',
    },
  });
  if (granted) {
    // Initialize the SDK
  } else {
    console.error(
      'Location and BT services are required to connect to a reader.'
    );
  }
} catch (e) {
  console.error(e);
}
```

Sinon, si vous avez besoin d’un contrôle précis sur les demandes d’autorisation, vous pouvez demander manuellement chaque permission en utilisant `PermissionsAndroid.request`&nbsp;:

```js
import { PermissionsAndroid } from 'react-native';

// Mobile readers using Bluetooth connection require BLUETOOTH_CONNECT, BLUETOOTH_SCAN, and ACCESS_FINE_LOCATION.
// This example shows the pattern for requesting one permission.
const granted = await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  {
    title: 'Location Permission',
    message: 'Stripe Terminal needs access to your location',
    buttonPositive: 'Accept',
  },
);

if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  console.log('Location permission granted');
} else {
  console.error('Location permission denied');
}
```

### Manifeste

Pour garantir une compatibilité avec Android&nbsp;12 et les versions ultérieures, veillez à ajouter `android:exported="true"` à `AndroidManifest.xml`&nbsp;:

```xml
<manifest ...>
    <application android:name=".MainApplication">
      <activity
        android:name=".MainActivity"
        android:exported="true">
          <!-- content -->
      </activity>
    </application>
</manifest>
```

Pour plus de contexte concernant les modifications apportées dans la version Android&nbsp;12, consultez la [documentation Android relative à l’exportation de composants plus sécurisée](https://developer.android.com/about/versions/12/behavior-changes-12#exported).

Pour les appareils sous Android&nbsp;11 ou version antérieure, vous devez également activer les autorisations via le manifeste&nbsp;:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.stripeterminalreactnative">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
</manifest>
```

#### Expo

> Ce package ne peut pas être utilisé dans l’application «&nbsp;Expo Go&nbsp;» car il nécessite un [code natif personnalisé](https://docs.expo.io/workflow/customizing/). Vous devez utiliser `npx expo prebuild` pour générer les projets natifs et exécuter votre application avec `npx expo run:ios` ou `npx expo run:android`.

#### iOS

### Configuration du SDK

Après l’[installation](https://docs.stripe.com/terminal/payments/setup-integration.md#installation) du SDK, ajoutez le [plugin de configuration](https://docs.expo.io/guides/config-plugins/) au tableau [plugins](https://docs.expo.io/versions/latest/config/app/#plugins) de votre `app.json` ou `app.config.js`&nbsp;:

```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-terminal-react-native",
        {
          "bluetoothBackgroundMode": true,
          "locationWhenInUsePermission": "Location access is required to accept payments.",
          "bluetoothPeripheralPermission": "Bluetooth access is required to connect to supported bluetooth card readers.",
          "bluetoothAlwaysUsagePermission": "This app uses Bluetooth to connect to supported card readers."
        }
      ]
    ]
  }
}
```

### Créer

Ensuite, recréez votre application comme décrit dans le guide consacré à l’[ajout de code natif personnalisé](https://docs.expo.io/workflow/customizing/) avec&nbsp;:

```bash
npx expo prebuild
```

puis&nbsp;:

```bash
npx expo run:ios
```

> Si vous utilisez Tap to Pay sur iPhone, vous devez [demander et configurer](https://developer.apple.com/documentation/proximityreader/setting-up-the-entitlement-for-tap-to-pay-on-iphone) le droit de développement Tap to Pay sur iPhone à partir de votre compte Apple Developer.

#### Android

### Autorisations

Le SDK Stripe Terminal nécessite les autorisations Android suivantes pour fonctionner correctement&nbsp;:

- `PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT`
- `PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN`
- `PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION`

Utilisez la fonction utilitaire `requestNeededAndroidPermissions` pour demander automatiquement toutes les autorisations requises avant d’initialiser le SDK Terminal&nbsp;:

```js
import { requestNeededAndroidPermissions } from '@stripe/stripe-terminal-react-native';

try {
  const granted = await requestNeededAndroidPermissions({
    accessFineLocation: {
      title: 'Location Permission',
      message: 'Stripe Terminal needs access to your location',
      buttonPositive: 'Accept',
    },
  });
  if (granted) {
    // Initialize the SDK
  } else {
    console.error(
      'Location and BT services are required to connect to a reader.'
    );
  }
} catch (e) {
  console.error(e);
}
```

Sinon, si vous avez besoin d’un contrôle précis sur les demandes d’autorisation, vous pouvez demander manuellement chaque permission en utilisant `PermissionsAndroid.request`&nbsp;:

```js
import { PermissionsAndroid } from 'react-native';

// Mobile readers using Bluetooth connection require BLUETOOTH_CONNECT, BLUETOOTH_SCAN, and ACCESS_FINE_LOCATION.
// This example shows the pattern for requesting one permission.
const granted = await PermissionsAndroid.request(
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  {
    title: 'Location Permission',
    message: 'Stripe Terminal needs access to your location',
    buttonPositive: 'Accept',
  },
);

if (granted === PermissionsAndroid.RESULTS.GRANTED) {
  console.log('Location permission granted');
} else {
  console.error('Location permission denied');
}
```

### Configuration du SDK

Après l’[installation](https://docs.stripe.com/terminal/payments/setup-integration.md#installation) du SDK, ajoutez le [plugin de configuration](https://docs.expo.io/guides/config-plugins/) au tableau [plugins](https://docs.expo.io/versions/latest/config/app/#plugins) de votre `app.json` ou `app.config.js`&nbsp;:

```json
{
  "expo": {
    "plugins": [
      [
        "@stripe/stripe-terminal-react-native",
        {
          "bluetoothBackgroundMode": true,
          "locationWhenInUsePermission": "Location access is required to accept payments.",
          "bluetoothPeripheralPermission": "Bluetooth access is required to connect to supported bluetooth card readers.",
          "bluetoothAlwaysUsagePermission": "This app uses Bluetooth to connect to supported card readers."
        }
      ]
    ]
  }
}
```

#### Créer

Ensuite, recréez votre application comme décrit dans le guide consacré à l’[ajout de code natif personnalisé](https://docs.expo.io/workflow/customizing/) avec&nbsp;:

```bash
npx expo prebuild
```

puis&nbsp;:

```bash
npx expo run:android
```

## Configurer l'endpoint du token de connexion [Côté serveur] [Côté client]

### Côté serveur

Pour se connecter à un lecteur, votre back-end doit donner au SDK la permission d’utiliser le lecteur avec votre compte Stripe en lui fournissant la [clé secrète](https://docs.stripe.com/api/terminal/connection_tokens/object.md#terminal_connection_token_object-secret) d’un [ConnectionToken](https://docs.stripe.com/api/terminal/connection_tokens.md). Votre back-end doit créer des tokens de connexion uniquement pour les clients qu’il reconnaît comme fiables.

#### curl

```bash
curl https://api.stripe.com/v1/terminal/connection_tokens \
  -u <<YOUR_SECRET_KEY>>: \
  -X "POST"
```

#### Ruby

```ruby

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
Stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = Stripe::Terminal::ConnectionToken.create
```

#### Python

```python

# Set your secret key. Remember to switch to your live secret key in production.
# See your keys here: https://dashboard.stripe.com/apikeys
stripe.api_key = '<<YOUR_SECRET_KEY>>'

# In a new endpoint on your server, create a ConnectionToken and return the
# `secret` to your app. The SDK needs the `secret` to connect to a reader.
connection_token = stripe.terminal.ConnectionToken.create()
```

#### PHP

```php

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
\Stripe\Stripe::setApiKey('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
$connectionToken = \Stripe\Terminal\ConnectionToken::create();
```

#### Java

```java

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
Stripe.apiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
ConnectionTokenCreateParams params =
  ConnectionTokenCreateParams.builder()
    .build();

ConnectionToken connectionToken = ConnectionToken.create(params);
```

#### Node.js

```javascript

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = require('stripe')('<<YOUR_SECRET_KEY>>');

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
let connectionToken = stripe.terminal.connectionTokens.create();
```

#### Go

```go

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
stripe.Key = "<<YOUR_SECRET_KEY>>"

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
params := &stripe.TerminalConnectionTokenParams{}
ct, _ := connectiontoken.New(params)
```

#### .NET

```csharp

// Set your secret key. Remember to switch to your live secret key in production.
// See your keys here: https://dashboard.stripe.com/apikeys
StripeConfiguration.ApiKey = "<<YOUR_SECRET_KEY>>";

// In a new endpoint on your server, create a ConnectionToken and return the
// `secret` to your app. The SDK needs the `secret` to connect to a reader.
var options = new ConnectionTokenCreateOptions{};
var service = new ConnectionTokenService();
var connectionToken = service.Create(options);
```

Obtenez la clé secrète à partir du `ConnectionToken` sur votre serveur et transmettez-la côté client.

#### Ruby

```ruby
post '/connection_token' do
  token = # ... Create or retrieve the ConnectionToken
  {secret: token.secret}.to_json
end
```

#### Python

```python
from flask import jsonify

@app.route('/connection_token', methods=['POST'])
def token():
  token = # ... Create or retrieve the ConnectionToken
  return jsonify(secret=token.secret)
```

#### PHP

```php
<?php
    $token = # ... Create or retrieve the ConnectionToken
    echo json_encode(array('secret' => $token->secret));
?>
```

#### Java

```java
import java.util.HashMap;
import java.util.Map;

import com.stripe.model.ConnectionToken;

import com.google.gson.Gson;
import static spark.Spark.post;

public class StripeJavaQuickStart {
    public static void main(String[] args) {
      Gson gson = new Gson();

      post("/connection_token", (request, response) -> {
        ConnectionToken token = // ... Fetch or create the ConnectionToken

        Map<String, String> map = new HashMap();
        map.put("secret", token.getSecret());

        return map;
      }, gson::toJson);
    }
}
```

#### Node.js

```javascript
const express = require('express');
const app = express();

app.post('/connection_token', async (req, res) => {
  const token = // ... Fetch or create the ConnectionToken
  res.json({secret: token.secret});
});

app.listen(3000, () => {
  console.log('Running on port 3000');
});
```

#### Go

```go
package main

import (
  "encoding/json"
  "net/http"
)

type TokenData struct {
  Secret string `json:"secret"`
}

func main() {
  http.HandleFunc("/connection_token", func(w http.ResponseWriter, r *http.Request) {
    token := // ... Fetch or create the ConnectionToken
    data := TokenData{
      Secret: token.secret,
    }
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(data)
  })

  http.ListenAndServe(":3000", nil)
}
```

#### .NET

```csharp
using System;
using Microsoft.AspNetCore.Mvc;

namespace StripeExampleApi.Controllers
{
    [Route("connection_token")]
    [ApiController]
    public class StripeApiController : Controller
    {
        [HttpPost]
        public ActionResult Post()
        {
            var token = // ... Fetch or create the ConnectionToken
            return Json(new {secret = token.Secret});
        }
    }
}
```

> Le `secret` du `ConnectionToken` vous permet de vous connecter à n’importe quel lecteur Stripe Terminal et de traiter les paiements à l’aide de votre compte Stripe. Veillez à authentifier l’endpoint pour créer des tokens de connexion et à le protéger contre la falsification des requêtes intersites (CSRF).

### Côté client

Pour permettre au SDK d’accéder à cet endpoint, créez une fonction de fournisseur de tokens qui demande un `ConnectionToken` à votre back-end.

```js
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';

const fetchTokenProvider = async () => {
  const response = await fetch(`{YOUR BACKEND URL}/connection_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const { secret } = await response.json();
  return secret;
};
```

Cette fonction est appelée dès lors que le SDK doit s’authentifier auprès de Stripe ou du lecteur. Elle est également appelée lorsqu’un nouveau token est nécessaire pour se connecter à un lecteur (par exemple, lorsque votre application s’est déconnectée du lecteur). Si le SDK n’est pas en mesure de récupérer un nouveau jeton de connexion depuis votre backend, la connexion au lecteur échoue associée à une erreur de votre serveur.

> Ne mettez pas en cache et ne codez pas en dur le token de connexion. Le SDK gère le cycle de vie du token.

## Initialiser le SDK [Côté client]

Pour commencer, transmettez votre fournisseur de tokens implémenté à l’[étape 3](https://docs.stripe.com/terminal/payments/setup-integration.md#connection-token) à `StripeTerminalProvider` en tant que propriété.

```js
import { StripeTerminalProvider } from '@stripe/stripe-terminal-react-native';

function Root() {
  const fetchTokenProvider = async () => {
    const response = await fetch(`${API_URL}/connection_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const { secret } = await response.json();
    return secret;
  };

  return (
    <StripeTerminalProvider
      logLevel="verbose"
      tokenProvider={fetchTokenProvider}
    >
      <App />
    </StripeTerminalProvider>
  );
}
```

En dernière étape, appelez la méthode `initialize` depuis le hook `useStripeTerminal`.

> Vous devez appeler la méthode `initialize` depuis un composant imbriqué dans `StripeTerminalProvider` et non depuis le composant qui contient `StripeTerminalProvider`.
> 
> Une fois l’initialisation terminée, vous pouvez utiliser d’autres méthodes du SDK telles que `discoverReaders`, `collectPaymentMethod` et `confirmPaymentIntent`. Si vous tentez d’appeler ces méthodes avant l’initialisation, vous recevrez le message d’erreur suivant&nbsp;: «&nbsp;Veuillez initialiser le SDK Stripe Terminal avant d’effectuer toute action.&nbsp;»

```js
function App() {
  const { initialize } = useStripeTerminal();

  useEffect(() => {
    initialize();
  }, []);

  return <View />;
}
```

## Mises à jour du SDK

Stripe publie régulièrement des mises à jour qui peuvent inclure de nouvelles fonctionnalités, des corrections de bugs et des mises à jour de sécurité. Mettez à jour votre SDK dès qu’une nouvelle version est disponible. Les SDK actuellement disponibles sont les suivants&nbsp;:

- [SDK Stripe Terminal Android](https://github.com/stripe/stripe-terminal-android/releases)
- [SDK Stripe Terminal iOS](https://github.com/stripe/stripe-terminal-ios/releases)
- [SDK Stripe Terminal JavaScript](https://docs.stripe.com/terminal/references/api/js-sdk.md#changelog)
- [SDK Stripe Terminal React Native](https://github.com/stripe/stripe-terminal-react-native)

## Prochaines étapes

- [Se connecter à un lecteur](https://docs.stripe.com/terminal/payments/connect-reader.md?terminal-sdk-platform=react-native&reader-type=internet)


# Apps on Devices

> This is a Apps on Devices for when terminal-sdk-platform is apps-on-devices. View the full page at https://docs.stripe.com/terminal/payments/setup-integration?terminal-sdk-platform=apps-on-devices.

Utilisez Apps on Devices pour exécuter votre application de point de vente (PDV) avec d’autres applications sur votre appareil. Vous pouvez déployer votre application de PDV sur les lecteurs intelligents Stripe pour fournir une solution tout-en-un ou créer une application de paiement destinée à vos clients, qui sera pilotée par votre PDV exécuté sur un autre appareil.

Stripe gère tous les paiements et la conformité avec le SDK Android Stripe Terminal.

En savoir plus sur [Apps on Devices](https://docs.stripe.com/terminal/features/apps-on-devices/overview.md). Vous pouvez également consulter l’[application test](https://github.com/stripe-samples/terminal-apps-on-devices) pour découvrir les bonnes pratiques d’intégration, comment collecter et confirmer un paiement et plus encore.
