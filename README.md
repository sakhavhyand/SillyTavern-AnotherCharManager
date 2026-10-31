# SillyTavern-AnotherCharManager

## DISCLAIMER
* I'm not a developer, so yes, my code is not perfect (especially the CSS, I hate that).
* This extension has not been tested on mobile phones, so expect the UI to be unusable on them. I don't intend to work on it, because I'm terrible with UI.

## What is this extension doing?

SillyTavern ACM is an extension which provides a different way to manage your characters.

I've decided to work on it to have something that better suits my needs, because I have way too many characters and most of them are not/poorly tagged.

* With ACM, you can sort by the number of tags characters have, for example, to find those without tags.
* Browsing and editing characters never changes the character of your open chat, so it won't change the chat recent history.
* You can edit the description, first message, alternative greetings, Creator's notes and the advanced definitions.
* You can create, rename, duplicate, delete, export and import characters.
* Replace the avatar (check prerequisites).
* Filter characters with a tag query (mandatory / at least one / excluded tags) and save it as a custom category.
* Browse your characters by tags, by creators or by your own custom categories.
* Make it yours: cards per row, window width, details layout, accent color and even the messages shown when nothing matches.

## Prerequisites

This extension has been tested from SillyTavern 1.11.0 to the last stable version.

The replace avatar feature requires SillyTavern 1.14.0 or later. No server plugin is needed anymore.

## Installation

Use SillyTavern's third party extension importer to install like any other extension.

## Usage

The extension will add a new button just before the Group button.

![01](https://github.com/user-attachments/assets/a862ae25-f069-4efe-a03d-a9488616c2b1)

But also in the extension menu next to the chat.

<img width="327" height="116" alt="image" src="https://github.com/user-attachments/assets/12f77921-d702-457b-a7c6-d78220f626f1" />

You can also open it with the `/another-char-manager` slash command.

### The character list

Clicking on these buttons will open a pop-up window showing your characters. The badge on each card shows how many tags the character has.

<img width="1023" height="271" alt="Image" src="https://github.com/user-attachments/assets/dd3ffde4-4739-4153-a564-c44387ad14ad" />

* Sort alphabetically, by number of tags, recent chat, date added or number of tokens.
* Search by name, creator, Creator's notes, tags, or all of them at once.
* Favorites are highlighted with a golden border, and you can filter to only display them.
* The dice picks a random character among the ones listed.
* The toolbar also gives access to the Manage Tags menu and the import buttons (file and URL).
* The fade at the bottom of the list tells you there are more characters below.

### Tag query

The tag button opens the tag query builder, to filter your characters by their tags:

* **Mandatory tags**: the character must have all of them.
* **At least one tag**: the character must have one of them.
* **Excluded tags**: the character must have none of them.

The filters stay active when the builder is closed: the badge on the tag button tells you how many are applied. The eraser clears them all, and the floppy disk saves them as a custom category in the preset of your choice.

<img width="457" height="337" alt="Image" src="https://github.com/user-attachments/assets/98b8e94e-8ac5-44c8-8587-ab0734298932" />

### Character details

When you select a character, its details are displayed at the bottom: avatar, information, tags, description, first message, alternative greetings and Creator's notes. Everything can be edited directly, changes are saved automatically.

From there you can also add it to your favorites, open its chat, rename, export, duplicate or delete it, open its advanced definitions and replace its avatar (click on it). Click on the line above the details to close them.

<img width="1037" height="618" alt="Image" src="https://github.com/user-attachments/assets/3cb3392f-81d0-4fb8-ac94-3b8a66983f53" />

The sections can be displayed stacked or as tabs (see Settings).

<img width="1044" height="627" alt="Image" src="https://github.com/user-attachments/assets/d4d2f872-e418-4932-b6fa-15c758eeffa8" />

When you close and reopen ACM, it comes back where you left it: same character selected, same place in the list.

### Character creation

The + button opens the creation window, with the main definitions and the advanced ones in two tabs.

<img width="935" height="1296" alt="Image" src="https://github.com/user-attachments/assets/e18b626a-5355-48ad-a8b8-e27e8f9da5ed" />


## Dropdown UI

A secondary UI is available, allowing you to display your characters grouped in sections. Switch between both with the Switch UI button.

<img width="511" height="632" alt="Image" src="https://github.com/user-attachments/assets/8ad7b246-faf6-428e-ae5e-be454fcc8e3b" />

* **All Tags**: one section per tag, drawn in the tag's colors.
* **Creators**: one section per creator.
* **Custom Categories**: your own sections, up to five presets.

<img width="1148" height="652" alt="Image" src="https://github.com/user-attachments/assets/a4a6f89b-e352-41a0-96a7-044c18813b9f" />

### Custom categories

Each category is defined by a tag query (mandatory / at least one / excluded tags). Create, rename, reorder and delete them from Manage Categories, or save your current tag query as a category from the tag query builder.

<img width="511" height="632" alt="Image" src="https://github.com/user-attachments/assets/8ad7b246-faf6-428e-ae5e-be454fcc8e3b" />

## Settings

The Settings button gives access to:

* **Width**: the width of the window, useful if you have a widescreen monitor.
* **Cards per row**: how many characters are displayed on each row.
* **Details panel**: stacked sections or tabs.
* **Accent color**: the color of the selection, active states and main buttons. Transparency is supported.
* **Empty list**: the messages shown when no character matches. One is picked at random, and SillyTavern macros such as `{{user}}` can be used.

<img width="308" height="276" alt="Image" src="https://github.com/user-attachments/assets/b26fe25a-2756-47b1-b3d8-dfc5b40ef2f0" />

<img width="606" height="358" alt="Image" src="https://github.com/user-attachments/assets/919437a3-f27a-483d-ab84-71de6d9ce4ec" />

<img width="859" height="400" alt="Image" src="https://github.com/user-attachments/assets/b27c292c-e318-4b97-a40a-8fe9ed7198b8" />

## Support and Contributions

If you encounter any issues while using this extension, please file an issue on GitHub. If you'd like to contribute to this project, feel free to fork the repository and submit a pull request.
You can also contact me on the extension-dedicated post on the Official ST Discord Server.
